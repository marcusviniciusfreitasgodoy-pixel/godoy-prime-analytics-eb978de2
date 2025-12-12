import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseWebSpeechOptions {
  lang?: string;
}

interface UseWebSpeechReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSTTSupported: boolean;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const { lang = 'pt-BR' } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5; // Increased retries
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSTTSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Request microphone permission explicitly
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast.error('Permissão de microfone negada. Verifique as configurações do navegador.');
      return false;
    }
  }, []);

  // Initialize STT
  useEffect(() => {
    if (!isSTTSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setTranscript('');
      retryCountRef.current = 0;
      
      // Set a longer silence timeout (30 seconds)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        if (shouldRestartRef.current) {
          console.log('Silence timeout - still listening');
        }
      }, 30000);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended, shouldRestart:', shouldRestartRef.current, 'retryCount:', retryCountRef.current);
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      // Auto-restart if user hasn't explicitly stopped
      if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log('Auto-restarting speech recognition, attempt:', retryCountRef.current);
        
        // Small delay before restart for mobile stability
        setTimeout(() => {
          if (shouldRestartRef.current) {
            try {
              recognition.start();
            } catch (error) {
              console.log('Could not restart:', error);
              setIsListening(false);
              shouldRestartRef.current = false;
            }
          }
        }, 200);
      } else {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'no-speech':
          // Don't show error, just keep listening if user wants
          if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
            console.log('No speech detected, will retry...');
            return; // Let onend handle restart
          }
          break;
          
        case 'audio-capture':
          toast.error('Microfone não detectado. Use o microfone do próprio computador (não do iPhone). Verifique Preferências do Sistema > Som > Entrada.', {
            duration: 8000
          });
          setIsListening(false);
          shouldRestartRef.current = false;
          break;
          
        case 'not-allowed':
          toast.error('Permissão de microfone negada. Clique no ícone de cadeado na barra de endereços.');
          setIsListening(false);
          shouldRestartRef.current = false;
          break;
          
        case 'network':
          toast.error('Erro de rede. Verifique sua conexão com a internet.');
          setIsListening(false);
          shouldRestartRef.current = false;
          break;
          
        case 'aborted':
          // User aborted, no error needed
          break;
          
        default:
          if (event.error !== 'no-speech') {
            setIsListening(false);
            shouldRestartRef.current = false;
          }
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      const result = finalTranscript || interimTranscript;
      if (result) {
        setTranscript(result);
        retryCountRef.current = 0; // Reset retry count when we get results
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, [lang, isSTTSupported]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    
    if (isListening) return;
    
    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;
    
    try {
      setTranscript('');
      shouldRestartRef.current = true;
      retryCountRef.current = 0;
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      
      // Try to abort and restart
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          if (shouldRestartRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart after abort:', e);
              toast.error('Não foi possível iniciar o microfone. Tente novamente.');
            }
          }
        }, 300);
      } catch (e) {
        console.error('Failed to restart after abort:', e);
        toast.error('Erro ao iniciar reconhecimento de voz.');
      }
    }
  }, [isListening, requestMicrophonePermission]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSTTSupported,
  };
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseWebSpeechOptions {
  lang?: string;
  silenceTimeout?: number; // ms to wait after silence before auto-stopping
}

interface UseWebSpeechReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSTTSupported: boolean;
  autoStopped: boolean; // true if stopped due to silence detection
  silenceCountdown: number; // countdown in seconds (0 = not counting)
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const { lang = 'pt-BR', silenceTimeout = 2500 } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [autoStopped, setAutoStopped] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef('');
  const hasSpeechRef = useRef(false);

  const isSTTSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(0);
  }, []);

  // Start silence countdown
  const startSilenceCountdown = useCallback(() => {
    // Only start if we have speech
    if (!hasSpeechRef.current) return;
    
    clearTimers();
    
    const totalMs = silenceTimeout;
    const startTime = Date.now();
    
    // Update countdown every 100ms
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSilenceCountdown(remaining);
    }, 100);
    
    // Auto-stop after silence timeout
    silenceTimerRef.current = setTimeout(() => {
      console.log('Silence detected - auto-stopping');
      clearTimers();
      setAutoStopped(true);
      shouldRestartRef.current = false;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition:', e);
        }
      }
      setIsListening(false);
    }, silenceTimeout);
  }, [silenceTimeout, clearTimers]);

  // Request microphone permission explicitly
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setAutoStopped(false);
      setSilenceCountdown(0);
      retryCountRef.current = 0;
      lastTranscriptRef.current = '';
      hasSpeechRef.current = false;
    };

    recognition.onend = () => {
      console.log('Speech recognition ended, shouldRestart:', shouldRestartRef.current, 'retryCount:', retryCountRef.current);
      
      clearTimers();
      
      // Auto-restart if user hasn't explicitly stopped and not auto-stopped
      if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log('Auto-restarting speech recognition, attempt:', retryCountRef.current);
        
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
          if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
            console.log('No speech detected, will retry...');
            return;
          }
          break;
          
        case 'audio-capture':
          toast.error('Microfone não detectado. Use o microfone do próprio computador (não do iPhone). Verifique Preferências do Sistema > Som > Entrada.', {
            duration: 8000
          });
          setIsListening(false);
          shouldRestartRef.current = false;
          clearTimers();
          break;
          
        case 'not-allowed':
          toast.error('Permissão de microfone negada. Clique no ícone de cadeado na barra de endereços.');
          setIsListening(false);
          shouldRestartRef.current = false;
          clearTimers();
          break;
          
        case 'network':
          toast.error('Erro de rede. Verifique sua conexão com a internet.');
          setIsListening(false);
          shouldRestartRef.current = false;
          clearTimers();
          break;
          
        case 'aborted':
          break;
          
        default:
          if (event.error !== 'no-speech') {
            setIsListening(false);
            shouldRestartRef.current = false;
            clearTimers();
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
        lastTranscriptRef.current = result;
        retryCountRef.current = 0;
        hasSpeechRef.current = true;
        
        // Reset silence timer on new speech
        startSilenceCountdown();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, [lang, isSTTSupported, clearTimers, startSilenceCountdown]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    
    if (isListening) return;
    
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;
    
    try {
      setTranscript('');
      setAutoStopped(false);
      setSilenceCountdown(0);
      shouldRestartRef.current = true;
      retryCountRef.current = 0;
      hasSpeechRef.current = false;
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      
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
    clearTimers();
    
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
    setIsListening(false);
  }, [clearTimers]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSTTSupported,
    autoStopped,
    silenceCountdown,
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

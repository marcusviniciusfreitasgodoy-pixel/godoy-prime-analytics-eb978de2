import { useState, useCallback, useRef, useEffect } from 'react';

interface UseWebSpeechOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseWebSpeechReturn {
  // STT (Speech-to-Text)
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSTTSupported: boolean;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const {
    lang = 'pt-BR',
  } = options;

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Check browser support
  const isSTTSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize STT
  useEffect(() => {
    if (!isSTTSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = lang;
    // Mobile fix: use continuous mode and keep listening
    recognition.continuous = true;
    recognition.interimResults = true;
    // Mobile fix: increase max alternatives for better accuracy
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setTranscript('');
      retryCountRef.current = 0;
    };

    recognition.onend = () => {
      console.log('Speech recognition ended, shouldRestart:', shouldRestartRef.current);
      // Mobile fix: auto-restart if user hasn't explicitly stopped
      if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log('Auto-restarting speech recognition, attempt:', retryCountRef.current);
        try {
          recognition.start();
        } catch (error) {
          console.log('Could not restart:', error);
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Mobile fix: handle "no-speech" error by restarting
      if (event.error === 'no-speech' && shouldRestartRef.current && retryCountRef.current < maxRetries) {
        console.log('No speech detected, will retry...');
        // Don't stop listening, let onend handle restart
        return;
      }
      // For other errors, stop completely
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const result = finalTranscript || interimTranscript;
      if (result) {
        setTranscript(result);
        // Reset retry count when we get results
        retryCountRef.current = 0;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, isSTTSupported]);

  // STT Controls
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    // If already listening, don't restart
    if (isListening) return;
    
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
          recognitionRef.current.start();
        }, 100);
      } catch (e) {
        console.error('Failed to restart after abort:', e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    // Always mark that we should stop
    shouldRestartRef.current = false;
    
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

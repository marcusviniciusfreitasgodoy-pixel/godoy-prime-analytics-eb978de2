import { useState, useCallback, useRef, useEffect } from 'react';

interface UseWebSpeechOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  voiceLang?: string;
}

interface UseWebSpeechReturn {
  // STT (Speech-to-Text)
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSTTSupported: boolean;
  
  // TTS (Text-to-Speech)
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isTTSSupported: boolean;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const {
    lang = 'pt-BR',
    continuous = false,
    interimResults = true,
    voiceLang = 'pt-BR'
  } = options;

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support
  const isSTTSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize STT
  useEffect(() => {
    if (!isSTTSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
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

      setTranscript(finalTranscript || interimTranscript);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, continuous, interimResults, isSTTSupported]);

  // STT Controls
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      setTranscript('');
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }, [isListening]);

  // TTS Controls
  const speak = useCallback((text: string) => {
    if (!isTTSSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.05; // Slightly higher for warmth
    utterance.volume = 1.0;

    // Get best available Portuguese voice with priority ranking
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order for premium voices
    const voicePriority = [
      // Google premium voices (best quality)
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'pt-BR',
      // Microsoft premium voices
      (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('pt'),
      // Apple premium voices
      (v: SpeechSynthesisVoice) => v.name.includes('Luciana') && v.lang.startsWith('pt'),
      (v: SpeechSynthesisVoice) => v.name.includes('Fernanda') && v.lang.startsWith('pt'),
      // Any Brazilian Portuguese female voice
      (v: SpeechSynthesisVoice) => v.lang === 'pt-BR' && (v.name.toLowerCase().includes('female') || v.name.includes('Luciana') || v.name.includes('Fernanda')),
      // Any Brazilian Portuguese voice
      (v: SpeechSynthesisVoice) => v.lang === 'pt-BR',
      // Any Portuguese voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('pt'),
    ];

    let selectedVoice: SpeechSynthesisVoice | null = null;
    for (const matcher of voicePriority) {
      selectedVoice = voices.find(matcher) || null;
      if (selectedVoice) break;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isTTSSupported, voiceLang]);

  const stopSpeaking = useCallback(() => {
    if (!isTTSSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isTTSSupported]);

  // Load voices when available
  useEffect(() => {
    if (!isTTSSupported) return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isTTSSupported]);

  return {
    // STT
    isListening,
    transcript,
    startListening,
    stopListening,
    isSTTSupported,
    
    // TTS
    isSpeaking,
    speak,
    stopSpeaking,
    isTTSSupported,
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

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceGender = 'female' | 'male' | 'auto';

interface UseWebSpeechOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  voiceLang?: string;
  voiceGender?: VoiceGender;
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
  
  // Available voices
  availableVoices: SpeechSynthesisVoice[];
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const {
    lang = 'pt-BR',
    continuous = false,
    interimResults = true,
    voiceLang = 'pt-BR',
    voiceGender = 'female'
  } = options;

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

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

  // TTS Controls
  const speak = useCallback((text: string) => {
    if (!isTTSSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = voiceGender === 'male' ? 0.9 : 1.1; // Adjust pitch based on gender
    utterance.volume = 1.0;

    // Get best available Portuguese voice with priority ranking
    const voices = window.speechSynthesis.getVoices();
    
    // Known female voice names
    const femaleNames = ['Luciana', 'Fernanda', 'Maria', 'Ana', 'Francisca', 'female', 'Female'];
    // Known male voice names
    const maleNames = ['Daniel', 'Felipe', 'Ricardo', 'João', 'male', 'Male'];
    
    const genderMatch = (v: SpeechSynthesisVoice) => {
      if (voiceGender === 'auto') return true;
      const nameLower = v.name.toLowerCase();
      if (voiceGender === 'female') {
        return femaleNames.some(name => v.name.includes(name) || nameLower.includes(name.toLowerCase()));
      } else {
        return maleNames.some(name => v.name.includes(name) || nameLower.includes(name.toLowerCase()));
      }
    };
    
    // Priority order for premium voices with gender preference
    const voicePriority = [
      // Google premium voices (best quality) with gender match
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'pt-BR' && genderMatch(v),
      // Microsoft premium voices with gender match
      (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('pt') && genderMatch(v),
      // Apple premium voices with gender match
      (v: SpeechSynthesisVoice) => v.lang.startsWith('pt') && genderMatch(v),
      // Any Brazilian Portuguese voice with gender match
      (v: SpeechSynthesisVoice) => v.lang === 'pt-BR' && genderMatch(v),
      // Fallback: Any Google Portuguese voice
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'pt-BR',
      // Fallback: Any Brazilian Portuguese voice
      (v: SpeechSynthesisVoice) => v.lang === 'pt-BR',
      // Fallback: Any Portuguese voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('pt'),
    ];

    let selectedVoice: SpeechSynthesisVoice | null = null;
    for (const matcher of voicePriority) {
      selectedVoice = voices.find(matcher) || null;
      if (selectedVoice) break;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Selected voice:', selectedVoice.name, selectedVoice.lang, 'Gender preference:', voiceGender);
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
  }, [isTTSSupported, voiceLang, voiceGender]);

  const stopSpeaking = useCallback(() => {
    if (!isTTSSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isTTSSupported]);

  // Load voices when available
  useEffect(() => {
    if (!isTTSSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter to Portuguese voices only
      const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
      setAvailableVoices(ptVoices);
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
    
    // Available voices
    availableVoices,
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

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for Web Speech API voice recognition
 * @param {Object} options - Configuration options
 * @returns {Object} Voice recognition state and controls
 */
const useVoiceRecognition = (options = {}) => {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    silenceTimeout = 1500, // Auto-stop after silence (ms)
    maxDuration = 30000, // Maximum recording duration (ms)
    onResult = null,
    onError = null,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const maxDurationTimerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      startTimeRef.current = Date.now();
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    };

    recognition.onend = () => {
      setIsListening(false);
      clearAllTimers();
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found. Please check your audio settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          errorMessage = null; // User aborted, no error message needed
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      if (errorMessage) {
        setError(errorMessage);
        onError?.(errorMessage);
      }
      
      setIsListening(false);
      clearAllTimers();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => (prev + ' ' + finalTranscript).trim());
        onResult?.(finalTranscript.trim());
        
        // Reset silence timer on speech
        resetSilenceTimer();
      }

      setInterimTranscript(interim);

      // Reset silence timer on any speech activity
      if (interim) {
        resetSilenceTimer();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearAllTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, [continuous, interimResults, language, onResult, onError]);

  const clearAllTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    }, silenceTimeout);
  }, [silenceTimeout, isListening]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition is not supported');
      return;
    }

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      recognitionRef.current.start();
      
      // Set maximum duration timer
      maxDurationTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, maxDuration);

      // Start silence detection
      resetSilenceTimer();
    } catch (e) {
      if (e.name === 'InvalidStateError') {
        // Already started, stop and restart
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (err) {
            setError('Failed to start speech recognition');
          }
        }, 100);
      } else {
        setError('Failed to start speech recognition');
      }
    }
  }, [isSupported, maxDuration, resetSilenceTimer]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
    }
    clearAllTimers();
  }, [clearAllTimers]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    recordingTime,
    startListening,
    stopListening,
    resetTranscript,
  };
};

export default useVoiceRecognition;


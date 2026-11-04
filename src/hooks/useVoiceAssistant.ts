import { useState, useCallback, useRef } from 'react';
import { AssistantState, CharacterAction } from '../types';
import { sttService } from '../services/speechToTextService';
import { aiService } from '../services/aiService';
import { ttsService } from '../services/textToSpeechService';

export function useVoiceAssistant() {
  const [state, setState] = useState<AssistantState>('idle');
  const [characterAction, setCharacterAction] = useState<CharacterAction>('idle');
  const [userText, setUserText] = useState<string>('');
  const [aiText, setAiText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Safety timer to prevent stuck speaking states
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * User taps microphone: Start listening or toggle off
   */
  const handleMicPress = useCallback(async () => {
    // If speaking, interrupt and go to idle
    if (state === 'speaking') {
      await ttsService.stop();
      setCharacterAction('idle');
      setState('idle');
      return;
    }

    if (state === 'listening') {
      // User tapped again to finish talking
      await finishRecordingAndProcess();
      return;
    }

    if (state !== 'idle') return;

    setErrorMessage(null);
    setPermissionDenied(false);

    const started = await sttService.startRecording();
    if (started) {
      setState('listening');
      setUserText('Listening to your voice...');
    } else {
      setPermissionDenied(true);
      setErrorMessage('Microphone access is required to speak with Melen.');
      setState('error');
    }
  }, [state]);

  /**
   * Stop recording, transcribe user voice, call AI, speak reply
   */
  const finishRecordingAndProcess = async () => {
    setState('thinking');
    setUserText('Processing speech...');

    const sttResult = await sttService.stopAndTranscribe();

    if (!sttResult.success || !sttResult.text) {
      setErrorMessage(sttResult.error || 'Could not understand audio.');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    const transcribed = sttResult.text;
    setUserText(transcribed);

    // Call LLM
    try {
      const reply = await aiService.generateReply(transcribed);
      setAiText(reply);

      // Transition to speaking state and trigger 3D talking animation
      setState('speaking');
      setCharacterAction('talk');

      await ttsService.speak(reply, {
        onStart: () => {
          setCharacterAction('talk');
        },
        onDone: () => {
          // Assignment requirement: "returns to idle when done"
          setCharacterAction('idle');
          setState('idle');
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        },
        onError: (err) => {
          console.error('[useVoiceAssistant] TTS error:', err);
          setCharacterAction('idle');
          setState('idle');
        },
      });

      // Fallback timeout in case TTS callback drops
      speechTimeoutRef.current = setTimeout(() => {
        setCharacterAction('idle');
        setState((current) => (current === 'speaking' ? 'idle' : current));
      }, 15000);
    } catch (err: any) {
      setErrorMessage('Network or AI service unavailable.');
      setState('error');
      setCharacterAction('idle');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  /**
   * Quick-send text query for testing or manual prompt entry
   */
  const askQuestion = useCallback(async (promptText: string) => {
    if (state !== 'idle') return;

    setUserText(promptText);
    setState('thinking');

    try {
      const reply = await aiService.generateReply(promptText);
      setAiText(reply);

      setState('speaking');
      setCharacterAction('talk');

      await ttsService.speak(reply, {
        onStart: () => setCharacterAction('talk'),
        onDone: () => {
          setCharacterAction('idle');
          setState('idle');
        },
        onError: () => {
          setCharacterAction('idle');
          setState('idle');
        },
      });
    } catch (e) {
      setErrorMessage('Failed to generate reply.');
      setState('error');
      setCharacterAction('idle');
    }
  }, [state]);

  const openSettings = () => {
    sttService.openSystemSettings();
  };

  const clearError = () => {
    setErrorMessage(null);
    setState('idle');
  };

  return {
    state,
    characterAction,
    userText,
    aiText,
    errorMessage,
    permissionDenied,
    handleMicPress,
    stopListening: finishRecordingAndProcess,
    askQuestion,
    openSettings,
    clearError,
  };
}

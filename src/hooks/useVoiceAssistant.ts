import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import { AssistantState, CharacterAction } from '../types';
import { sttService } from '../services/speechToTextService';
import { aiService } from '../services/aiService';
import { ttsService } from '../services/textToSpeechService';
import { ServiceError } from '../services/providerService';

export function useVoiceAssistant() {
  const [state, setState] = useState<AssistantState>('idle');
  const stateRef = useRef<AssistantState>('idle');
  const [characterAction, setCharacterAction] = useState<CharacterAction>('idle');
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const active = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transition = useCallback((next: AssistantState) => { stateRef.current = next; setState(next); }, []);
  const clearTimer = useCallback(() => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    recordingTimer.current = null;
  }, []);
  const clearError = useCallback(() => {
    setErrorMessage(null); setPermissionDenied(false);
    if (stateRef.current === 'error') transition('idle');
  }, [transition]);
  const fail = useCallback((error: unknown, controller: AbortController) => {
    if (active.current !== controller || controller.signal.aborted) return;
    setCharacterAction('idle');
    setPermissionDenied(error instanceof ServiceError && error.kind === 'permission');
    setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please retry.');
    transition('error');
  }, [transition]);

  const cancel = useCallback(async () => {
    busy.current = true;
    active.current?.abort(); active.current = null;
    clearTimer();
    setCharacterAction('idle'); transition('idle');
    await Promise.allSettled([sttService.cancel(), ttsService.stop()]);
    busy.current = false;
  }, [clearTimer, transition]);

  const reply = useCallback(async (text: string, controller: AbortController) => {
    const valid = () => active.current === controller && !controller.signal.aborted;
    if (/\b(travel|trip|flight|train|ticket|tickets|walk|walking)\b/i.test(text)) {
      setCharacterAction('walk');
    }
    const response = await aiService.generateReply(text, controller.signal);
    if (!valid()) return;
    setAiText(response);
    await ttsService.speak(response, controller.signal, () => {
      if (valid()) { transition('speaking'); setCharacterAction('talk'); }
    });
    if (valid()) { transition('idle'); setCharacterAction('idle'); active.current = null; }
  }, [transition]);

  const finishRecordingAndProcess = useCallback(async () => {
    if (busy.current || stateRef.current !== 'listening' || !active.current) return;
    busy.current = true; clearTimer();
    const controller = active.current;
    transition('thinking');
    busy.current = false;
    try {
      const text = await sttService.stopAndTranscribe(controller.signal);
      if (active.current !== controller || controller.signal.aborted) return;
      setUserText(text);
      // Cancellation is available while the provider or TTS is working.
      busy.current = false;
      await reply(text, controller);
    } catch (error) { fail(error, controller); }
    finally { if (active.current === controller) busy.current = false; }
  }, [clearTimer, fail, reply, transition]);

  const handleMicPress = useCallback(async () => {
    if (busy.current) return;
    if (stateRef.current === 'speaking' || stateRef.current === 'thinking') { await cancel(); return; }
    if (stateRef.current === 'listening') { await finishRecordingAndProcess(); return; }
    busy.current = true;
    clearError(); setUserText(''); setAiText('');
    const controller = new AbortController(); active.current = controller;
    transition('preparing');
    try {
      await sttService.startRecording();
      if (active.current !== controller || controller.signal.aborted) return;
      transition('listening');
      recordingTimer.current = setTimeout(() => { void finishRecordingAndProcess(); }, 60000);
    } catch (error) { fail(error, controller); }
    finally { if (active.current === controller) busy.current = false; }
  }, [cancel, clearError, fail, finishRecordingAndProcess, transition]);

  const askQuestion = useCallback(async (text: string) => {
    if (busy.current || !['idle', 'error'].includes(stateRef.current)) return;
    clearError(); setUserText(text); setAiText(''); transition('thinking');
    const controller = new AbortController(); active.current = controller;
    try { await reply(text, controller); } catch (error) { fail(error, controller); }
  }, [clearError, fail, reply, transition]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') void cancel();
      if (next === 'active' && stateRef.current === 'error') clearError();
    });
    return () => {
      subscription.remove(); active.current?.abort(); active.current = null; clearTimer();
      void sttService.cancel(); void ttsService.stop().catch(() => {});
    };
  }, [cancel, clearError, clearTimer]);

  const openSettings = useCallback(() => {
    void sttService.openSystemSettings().catch(() => setErrorMessage('Open your device Settings and enable microphone access for Melen.'));
  }, []);

  return { state, characterAction, userText, aiText, errorMessage, permissionDenied,
    handleMicPress, askQuestion, openSettings, clearError, cancel };
}

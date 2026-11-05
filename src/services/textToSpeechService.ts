import * as Speech from 'expo-speech';

export class TextToSpeechService {
  public async speak(text: string, signal: AbortSignal, onStart: () => void): Promise<void> {
    if (signal.aborted) return;
    await Speech.stop();
    if (signal.aborted) return;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let started = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        clearInterval(watchdog);
        signal.removeEventListener('abort', cancel);
        if (error) reject(error); else resolve();
      };
      const cancel = () => { void Speech.stop().catch(() => {}); finish(); };
      const startTimer = setTimeout(() => {
        void Speech.stop().catch(() => {});
        finish(new Error('Speech could not start. Check your device voice settings and retry.'));
      }, 15000);
      // Recover if a platform loses its completion callback, without cutting off long replies.
      const watchdog = setInterval(() => {
        if (started) void Speech.isSpeakingAsync().then(active => { if (!active) finish(); }).catch(() => {});
      }, 1000);
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) { cancel(); return; }
      try {
        Speech.speak(text, {
          language: 'en-US', rate: 0.95,
          onStart: () => { if (!settled) { started = true; clearTimeout(startTimer); onStart(); } },
          onDone: () => finish(),
          onStopped: () => finish(),
          onError: () => finish(new Error('Speech playback failed. Check your device voice settings and retry.')),
        });
      } catch { finish(new Error('Speech playback is unavailable. Please retry.')); }
    });
  }
  public async stop() { await Speech.stop(); }
}
export const ttsService = new TextToSpeechService();

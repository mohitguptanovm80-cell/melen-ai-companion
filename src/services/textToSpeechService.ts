import * as Speech from 'expo-speech';

export interface TTSCallbacks {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: any) => void;
}

export class TextToSpeechService {
  private isSpeakingInternal: boolean = false;

  public async speak(text: string, callbacks?: TTSCallbacks): Promise<void> {
    try {
      // Stop any previous speech
      await this.stop();

      this.isSpeakingInternal = true;

      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.05,
        rate: 0.95,
        onStart: () => {
          this.isSpeakingInternal = true;
          callbacks?.onStart?.();
        },
        onDone: () => {
          this.isSpeakingInternal = false;
          callbacks?.onDone?.();
        },
        onStopped: () => {
          this.isSpeakingInternal = false;
          callbacks?.onDone?.();
        },
        onError: (err) => {
          this.isSpeakingInternal = false;
          callbacks?.onError?.(err);
        },
      });
    } catch (err) {
      this.isSpeakingInternal = false;
      callbacks?.onError?.(err);
    }
  }

  public async stop(): Promise<void> {
    this.isSpeakingInternal = false;
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }
    } catch (e) {
      // Ignore stop errors
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }
}

export const ttsService = new TextToSpeechService();

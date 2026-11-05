import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { Linking } from 'react-native';
import { getProvider, providerRequest, ServiceError } from './providerService';

function deleteRecording(uri: string | null) {
  if (!uri) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Cache cleanup is best effort. */ }
}

export class SpeechToTextService {
  private recorder: AudioRecorder | null = null;
  private generation = 0;

  public async startRecording(): Promise<void> {
    getProvider();
    const generation = ++this.generation;
    const { granted } = await requestRecordingPermissionsAsync();
    if (generation !== this.generation) return;
    if (!granted) throw new ServiceError('Microphone permission is denied. Enable it in Settings, then tap Retry.', 'permission');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    if (generation !== this.generation) {
      await setAudioModeAsync({ allowsRecording: false });
      return;
    }
    // AudioModule is a typed native object; ESLint's static namespace resolver cannot inspect it.
    // eslint-disable-next-line import/namespace
    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    try {
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      if (generation !== this.generation) {
        deleteRecording(recorder.uri);
        recorder.release();
        await setAudioModeAsync({ allowsRecording: false });
        return;
      }
      recorder.record();
      this.recorder = recorder;
    } catch {
      deleteRecording(recorder.uri);
      recorder.release();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      throw new ServiceError('Could not start recording. Check that the microphone is available and retry.');
    }
  }

  public async stopAndTranscribe(signal: AbortSignal): Promise<string> {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) throw new ServiceError('No recording is available. Tap the microphone to try again.');
    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!uri) throw new ServiceError('The recording is empty. Please try again.');
      const body = new FormData();
      body.append('file', { uri, name: 'recording.m4a', type: 'audio/mp4' } as unknown as Blob);
      body.append('model', getProvider().transcriptionModel);
      // fetch supplies the multipart boundary. Do not manually set Content-Type.
      const data = await providerRequest('/audio/transcriptions', body, signal) as { text?: unknown };
      if (typeof data?.text !== 'string' || !data.text.trim()) throw new ServiceError('No speech was recognized. Please speak clearly and retry.');
      return data.text.trim();
    } finally {
      uri ??= recorder.uri;
      recorder.release();
      deleteRecording(uri);
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  }

  public async cancel(): Promise<void> {
    ++this.generation;
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      try { await recorder.stop(); } catch { /* Already stopped by the OS. */ }
      deleteRecording(recorder.uri);
      recorder.release();
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }

  public openSystemSettings() { return Linking.openSettings(); }
}
export const sttService = new SpeechToTextService();

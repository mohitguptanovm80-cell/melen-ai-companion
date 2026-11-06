export type AssistantState =
  | 'idle'
  | 'preparing'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export type CharacterAction = 'idle' | 'talk' | 'gesture' | 'walk';

export interface ModelMetadata {
  fileName: string;
  animations: string[];
  activeClipName: string | null;
  boundingBox: {
    width: number;
    height: number;
    depth: number;
    center: { x: number; y: number; z: number };
  };
  triangleCount?: number;
  isLoaded: boolean;
}

export interface ConversationTurn {
  id: string;
  userText: string;
  aiText: string;
  state: AssistantState;
  error?: string | null;
}

export interface VoiceState {
  isRecording: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  permissionGranted: boolean | null;
  error: string | null;
}

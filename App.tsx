import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CharacterCanvas, CharacterCanvasRef } from './src/components/3d/CharacterCanvas';
import { VoiceControls } from './src/components/ui/VoiceControls';
import { ConversationBubble } from './src/components/ui/ConversationBubble';
import { ModelInspectorBadge } from './src/components/ui/ModelInspectorBadge';
import { NetworkStatusBar } from './src/components/ui/NetworkStatusBar';
import { useVoiceAssistant } from './src/hooks/useVoiceAssistant';
import { ModelMetadata } from './src/types';

export default function App() {
  const canvasRef = useRef<CharacterCanvasRef | null>(null);
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);

  const {
    state,
    characterAction,
    userText,
    aiText,
    errorMessage,
    permissionDenied,
    handleMicPress,
    askQuestion,
    openSettings,
    clearError,
  } = useVoiceAssistant();

  const handleResetCamera = () => {
    canvasRef.current?.resetCamera();
  };

  const handleSelectClip = (clipName: string) => {
    canvasRef.current?.playCustomClip(clipName);
  };

  const samplePrompts = [
    'Hi, how was your day?',
    'Tell me a robot joke!',
    'Show me a cool dance!',
  ];

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* 1. Underlying 3D Viewport with Orbit & Zoom Gestures */}
        <CharacterCanvas
          ref={canvasRef}
          action={characterAction}
          onMetadataLoaded={(meta) => setModelMetadata(meta)}
          onError={(err) => console.warn('[App] 3D Canvas error:', err)}
        />

        {/* 2. Floating UI Controls Layer */}
        <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">
          {/* Top Bar & Model Inspector */}
          <View pointerEvents="box-none">
            <ModelInspectorBadge
              metadata={modelMetadata}
              onResetCamera={handleResetCamera}
              onSelectClip={handleSelectClip}
            />

            <NetworkStatusBar
              errorMessage={errorMessage}
              permissionDenied={permissionDenied}
              onOpenSettings={openSettings}
              onDismiss={clearError}
            />
          </View>

          {/* Bottom Interaction Area */}
          <View style={styles.bottomSection} pointerEvents="box-none">
            {/* Quick Test Prompt Chips for evaluators */}
            {state === 'idle' && !userText && (
              <View style={styles.promptsContainer} pointerEvents="box-none">
                <Text style={styles.promptsHeading}>Ask Melen by voice or tap:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promptsList}
                >
                  {samplePrompts.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.promptChip}
                      onPress={() => askQuestion(prompt)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.promptText}>"{prompt}"</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Conversation Text Bubbles */}
            <ConversationBubble userText={userText} aiText={aiText} state={state} />

            {/* Mic Button & Voice State Pill */}
            <VoiceControls state={state} onPress={handleMicPress} />
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  uiOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  bottomSection: {
    justifyContent: 'flex-end',
  },
  promptsContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  promptsHeading: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptsList: {
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  promptText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
  },
});

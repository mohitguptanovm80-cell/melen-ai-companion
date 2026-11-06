import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  CharacterCanvas,
  CharacterCanvasRef,
} from "./src/components/3d/CharacterCanvas";
import { ProviderSetup } from "./src/components/ui/ProviderSetup";
import { VoiceControls } from "./src/components/ui/VoiceControls";
import { ConversationBubble } from "./src/components/ui/ConversationBubble";
import { ModelInspectorBadge } from "./src/components/ui/ModelInspectorBadge";
import { NetworkStatusBar } from "./src/components/ui/NetworkStatusBar";
import { useVoiceAssistant } from "./src/hooks/useVoiceAssistant";
import { ModelMetadata } from "./src/types";

export default function App() {
  const canvasRef = useRef<CharacterCanvasRef | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const voice = useVoiceAssistant();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ModelInspectorBadge
          metadata={metadata}
          onResetCamera={() => canvasRef.current?.resetCamera()}
          onSelectClip={(name) => canvasRef.current?.playCustomClip(name)}
        />
        <ProviderSetup
          disabled={!["idle", "error"].includes(voice.state)}
          onChanged={voice.clearError}
        />
        <NetworkStatusBar
          errorMessage={voice.errorMessage}
          permissionDenied={voice.permissionDenied}
          onOpenSettings={voice.openSettings}
          onDismiss={voice.clearError}
        />
        <View collapsable={false} style={styles.viewport}>
          <CharacterCanvas
            ref={canvasRef}
            action={voice.characterAction}
            onMetadataLoaded={setMetadata}
          />
        </View>
        <Text style={styles.hint}>Drag to rotate · Pinch to zoom</Text>
        <View style={styles.conversation}>
          <ScrollView contentContainerStyle={{ paddingTop: 8 }}>
            <ConversationBubble
              userText={voice.userText}
              aiText={voice.aiText}
              state={voice.state}
            />
          </ScrollView>
        </View>
        {voice.state === "idle" && !voice.userText && (
          <ScrollView
            horizontal
            style={styles.prompts}
            contentContainerStyle={styles.promptContent}
            showsHorizontalScrollIndicator={false}
          >
            {[
              "Book my ticket from Jaipur to Pune",
              "Tell me a robot joke!",
              "Who are you?",
            ].map((prompt) => (
              <TouchableOpacity
                key={prompt}
                accessibilityRole="button"
                style={styles.chip}
                onPress={() => voice.askQuestion(prompt)}
              >
                <Text style={styles.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <VoiceControls state={voice.state} onPress={voice.handleMicPress} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  viewport: { flex: 1, minHeight: 140 },
  hint: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 4,
  },
  conversation: { maxHeight: "27%" },
  prompts: { flexGrow: 0, marginBottom: 14 },
  promptContent: { gap: 8, paddingHorizontal: 16 },
  chip: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  promptText: { color: "#cbd5e1", fontSize: 12 },
});

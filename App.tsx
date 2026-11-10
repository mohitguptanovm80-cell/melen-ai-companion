import './src/services/backendSetup';
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
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
import { isProviderConfigured } from "./src/services/providerService";

export default function App() {
  const canvasRef = useRef<CharacterCanvasRef | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const voice = useVoiceAssistant();
  const [setupVisible, setSetupVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const canSend = ["idle", "error"].includes(voice.state);
  const ask = (text: string) => {
    if (!text.trim() || !canSend) return false;
    if (!isProviderConfigured()) { setSetupVisible(true); return false; }
    void voice.askQuestion(text.trim());
    return true;
  };
  const send = () => { if (ask(draft)) setDraft(""); };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ModelInspectorBadge
          metadata={metadata}
          onResetCamera={() => canvasRef.current?.resetCamera()}
          onSelectClip={(name) => canvasRef.current?.playCustomClip(name)}
        />
        <ProviderSetup
          visible={setupVisible}
          onVisibleChange={setSetupVisible}
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
        <VoiceControls state={voice.state} onPress={() => {
          if (canSend && !isProviderConfigured()) setSetupVisible(true);
          else void voice.handleMicPress();
        }} />
        <View style={styles.composer}>
          <TextInput
            style={styles.messageInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Message to Melen"
            editable={canSend}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend || !draft.trim() }}
            disabled={!canSend || !draft.trim()}
            onPress={send}
            style={[styles.sendButton, (!canSend || !draft.trim()) && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  body: { flex: 1 },
  viewport: { flex: 1, minHeight: 0 },
  composer: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  messageInput: { flex: 1, minWidth: 0, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "#475569", backgroundColor: "#1e293b", color: "#fff", paddingHorizontal: 16, fontSize: 16 },
  sendButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: "#6366f1", justifyContent: "center" },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 15 },
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

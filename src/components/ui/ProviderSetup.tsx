import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { configureProvider, clearProvider, defaultProvider } from '../../services/providerService';

export function ProviderSetup({ disabled, onChanged }: { disabled: boolean; onChanged: () => void }) {
  const [visible, setVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [baseUrl, setBaseUrl] = useState(defaultProvider.baseUrl);
  const [chatModel, setChatModel] = useState(defaultProvider.chatModel);
  const [transcriptionModel, setTranscriptionModel] = useState(defaultProvider.transcriptionModel);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const close = () => { setApiKey(''); setError(''); setVisible(false); };
  const connect = () => {
    try {
      configureProvider({ baseUrl, chatModel, transcriptionModel, apiKey });
      setConnected(true); onChanged(); close();
    } catch (e) { setError(e instanceof Error ? e.message : 'Check your provider settings.'); }
  };
  return <>
    <TouchableOpacity disabled={disabled} onPress={() => setVisible(true)} accessibilityRole="button" style={styles.trigger}>
      <Text style={styles.text}>{connected ? 'Voice setup · configured' : 'Voice setup · connect to talk'}</Text>
    </TouchableOpacity>
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.title}>Connect your voice provider</Text>
            <Text style={styles.text}>For this evaluation, use your own OpenAI-compatible provider with transcription and chat support. Audio and prompts are sent to the address below. API usage may incur charges.</Text>
            <Text style={styles.text}>Your key stays in memory for this app session. It is never saved. Use the client’s authenticated backend for production.</Text>
            <Text style={styles.label}>API base URL</Text>
            <TextInput accessibilityLabel="API base URL" style={styles.input} value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <Text style={styles.label}>API key {connected ? '(enter again to change setup)' : ''}</Text>
            <TextInput accessibilityLabel="API key" style={styles.input} value={apiKey} onChangeText={setApiKey} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" />
            <Text style={styles.label}>Chat model</Text>
            <TextInput accessibilityLabel="Chat model" style={styles.input} value={chatModel} onChangeText={setChatModel} autoCapitalize="none" autoCorrect={false} />
            <Text style={styles.label}>Transcription model</Text>
            <TextInput accessibilityLabel="Transcription model" style={styles.input} value={transcriptionModel} onChangeText={setTranscriptionModel} autoCapitalize="none" autoCorrect={false} />
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={connect}><Text style={styles.text}>Use for this session</Text></TouchableOpacity>
            {connected && <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={() => { clearProvider(); setConnected(false); onChanged(); close(); }}><Text style={styles.text}>Disconnect and forget key</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={close}><Text style={styles.text}>Back to character</Text></TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  text: { color: '#e2e8f0', fontSize: 14, lineHeight: 21 },
  label: { color: '#a5b4fc', fontWeight: '600', marginTop: 10 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#475569' },
  button: { backgroundColor: '#4338ca', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  trigger: { marginHorizontal: 20, padding: 10, alignSelf: 'flex-end', backgroundColor: '#1e293b', borderRadius: 12 },
  error: { color: '#fca5a5' },
});

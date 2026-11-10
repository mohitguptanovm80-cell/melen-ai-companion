import React from 'react';
import { Modal, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isProviderConfigured } from '../../services/providerService';

export function ProviderSetup({ disabled, visible, onVisibleChange }: {
  disabled: boolean; onChanged: () => void; visible: boolean; onVisibleChange: (visible: boolean) => void;
}) {
  const configured = isProviderConfigured();
  return <>
    <TouchableOpacity disabled={disabled} onPress={() => onVisibleChange(true)} accessibilityRole="button" style={styles.trigger}>
      <Text style={styles.text}>{configured ? 'Melen AI · ready' : 'Melen AI · setup required'}</Text>
    </TouchableOpacity>
    <Modal visible={visible} animationType="slide" onRequestClose={() => onVisibleChange(false)}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Melen AI</Text>
          <Text style={styles.text}>{configured
            ? 'Chat and voice use the Melen Azure AI service. Your messages and recordings are sent to this service to generate a response.'
            : 'The AI connection is missing. Start the project server and reopen the app. Installed builds need the AI backend address configured before building.'}</Text>
          <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={() => onVisibleChange(false)}><Text style={styles.text}>Back to Melen</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, gap: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  text: { color: '#e2e8f0', fontSize: 14, lineHeight: 21 },
  button: { backgroundColor: '#4338ca', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  trigger: { marginHorizontal: 20, padding: 10, alignSelf: 'flex-end', backgroundColor: '#1e293b', borderRadius: 12 },
});

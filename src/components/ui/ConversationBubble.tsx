import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssistantState } from '../../types';

interface ConversationBubbleProps {
  userText: string;
  aiText: string;
  state: AssistantState;
}

export const ConversationBubble: React.FC<ConversationBubbleProps> = ({
  userText,
  aiText,
  state,
}) => {
  if (!userText && !aiText) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* User message card */}
      {userText ? (
        <View style={styles.userCard}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="account" size={16} color="#94a3b8" />
            <Text style={styles.headerLabel}>You</Text>
          </View>
          <Text style={styles.userMessage}>{userText}</Text>
        </View>
      ) : null}

      {/* AI response card */}
      {aiText ? (
        <View style={styles.aiCard}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="robot" size={16} color="#818cf8" />
            <Text style={[styles.headerLabel, { color: '#818cf8' }]}>Melen AI</Text>
            {state === 'speaking' && (
              <View style={styles.speakingIndicator}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            )}
          </View>
          <Text style={styles.aiMessage}>{aiText}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  userCard: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  aiCard: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#818cf8',
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  userMessage: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  aiMessage: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
});

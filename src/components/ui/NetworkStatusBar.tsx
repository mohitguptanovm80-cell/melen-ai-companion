import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface NetworkStatusBarProps {
  errorMessage: string | null;
  permissionDenied: boolean;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({
  errorMessage,
  permissionDenied,
  onOpenSettings,
  onDismiss,
}) => {
  if (!errorMessage) return null;

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons
        name={permissionDenied ? 'microphone-off' : 'wifi-alert'}
        size={20}
        color="#f87171"
      />
      <Text style={styles.message} numberOfLines={2}>
        {errorMessage}
      </Text>

      {permissionDenied ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onOpenSettings}>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <MaterialCommunityIcons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  message: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  actionBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: 4,
  },
});

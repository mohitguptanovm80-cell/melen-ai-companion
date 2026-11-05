import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssistantState } from '../../types';

interface VoiceControlsProps {
  state: AssistantState;
  onPress: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({ state, onPress }) => {
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const getStatusText = () => {
    switch (state) {
      case 'preparing':
        return 'Preparing microphone...';
      case 'listening':
        return 'Listening... (Tap when done)';
      case 'thinking':
        return 'Processing… (Tap to cancel)';
      case 'speaking':
        return 'Speaking (Tap to interrupt)';
      case 'error':
        return 'Tap to retry';
      default:
        return 'Tap to talk to Melen';
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'listening':
        return '#ef4444'; // Red recording
      case 'thinking':
        return '#f59e0b'; // Amber
      case 'speaking':
        return '#10b981'; // Green speaking
      default:
        return '#6366f1'; // Indigo brand
    }
  };

  const getIconName = () => {
    switch (state) {
      case 'listening':
        return 'stop';
      case 'thinking':
        return 'dots-horizontal';
      case 'speaking':
        return 'volume-high';
      default:
        return 'microphone';
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.pillContainer}>
        <View style={[styles.statusDot, { backgroundColor: getButtonColor() }]} />
        <Text style={styles.statusLabel}>{getStatusText()}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        {(state === 'listening' || state === 'speaking') && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: getButtonColor(),
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.micButton, { backgroundColor: getButtonColor() }]}
          onPress={onPress}
          disabled={state === 'preparing'}
          accessibilityRole="button"
          accessibilityLabel={getStatusText()}
        >
          {state === 'thinking' ? (
            <MaterialCommunityIcons name="robot" size={32} color="#ffffff" />
          ) : (
            <MaterialCommunityIcons name={getIconName() as any} size={34} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 28,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonWrapper: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    opacity: 0.6,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});

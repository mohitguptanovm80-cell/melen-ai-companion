import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ModelMetadata } from '../../types';

interface ModelInspectorBadgeProps {
  metadata: ModelMetadata | null;
  onResetCamera: () => void;
  onSelectClip: (clipName: string) => void;
}

export const ModelInspectorBadge: React.FC<ModelInspectorBadgeProps> = ({
  metadata,
  onResetCamera,
  onSelectClip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);

  const handleClipPress = (clip: string) => {
    setSelectedClip(clip);
    onSelectClip(clip);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleGroup}>
          <Text style={styles.appTitle}>Melen AI</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3D COMPANION</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onResetCamera}
            accessibilityLabel="Reset 3D camera"
          >
            <MaterialCommunityIcons name="camera-retake-outline" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, isOpen && styles.iconButtonActive]}
            onPress={() => setIsOpen(!isOpen)}
            accessibilityLabel="Toggle 3D model inspector"
          >
            <MaterialCommunityIcons
              name="cube-scan"
              size={20}
              color={isOpen ? '#818cf8' : '#cbd5e1'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Inspector Drawer */}
      {isOpen && metadata && (
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <MaterialCommunityIcons name="cube-outline" size={16} color="#818cf8" />
            <Text style={styles.drawerTitle}>Model Inspector (Evaluator HUD)</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Model</Text>
              <Text style={styles.gridValue}>{metadata.fileName}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Auto-Fit Bounds (W×H×D)</Text>
              <Text style={styles.gridValue}>
                {metadata.boundingBox.width}m × {metadata.boundingBox.height}m × {metadata.boundingBox.depth}m
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Embedded Animations ({metadata.animations.length}):
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clipsScroll}
          >
            {metadata.animations.map((clip) => {
              const isSelected = selectedClip === clip;
              return (
                <TouchableOpacity
                  key={clip}
                  style={[styles.clipChip, isSelected && styles.clipChipActive]}
                  onPress={() => handleClipPress(clip)}
                >
                  <Text style={[styles.clipText, isSelected && styles.clipTextActive]}>
                    {clip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.hintText}>
            💡 Tip: Drag with 1 finger to rotate. Pinch with 2 fingers to zoom.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  badgeText: {
    color: '#a5b4fc',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconButtonActive: {
    borderColor: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  drawer: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  drawerTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  gridItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    padding: 8,
    borderRadius: 8,
  },
  gridLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  gridValue: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  clipsScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  clipChip: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  clipChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
  },
  clipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500',
  },
  clipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  hintText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { TouchOrbitControls } from './GestureController';
import { ModelManager } from './ModelManager';
import { CharacterAction, ModelMetadata } from '../../types';

export interface CharacterCanvasRef {
  resetCamera: () => void;
  playCustomClip: (clipName: string) => void;
}

interface CharacterCanvasProps {
  modelAsset?: number | string;
  action: CharacterAction;
  onMetadataLoaded?: (metadata: ModelMetadata) => void;
  onError?: (err: string) => void;
}

export const CharacterCanvas = forwardRef<CharacterCanvasRef, CharacterCanvasProps>(
  (
    {
      modelAsset = require('../../../assets/models/RobotExpressive.glb'),
      action,
      onMetadataLoaded,
      onError,
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState('Initializing 3D engine...');

    const modelManagerRef = useRef<ModelManager | null>(null);
    const controlsRef = useRef<TouchOrbitControls>(
      new TouchOrbitControls({
        initialDistance: 3.5,
        minDistance: 1.8,
        maxDistance: 6.0,
      })
    );
    const animFrameRef = useRef<number | null>(null);

    // Forward ref methods
    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        controlsRef.current.reset();
      },
      playCustomClip: (clipName: string) => {
        modelManagerRef.current?.playClip(clipName, 0.3);
      },
    }));

    // React to character action changes (idle <-> talk)
    useEffect(() => {
      if (modelManagerRef.current) {
        modelManagerRef.current.setCharacterAction(action);
      }
    }, [action]);

    const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
      try {
        setLoadingProgress('Configuring WebGL...');

        // 1. Create Three.js WebGLRenderer bound to expo-gl context
        const renderer = new THREE.WebGLRenderer({
          canvas: {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
            style: {},
            addEventListener: () => {},
            removeEventListener: () => {},
            clientWidth: gl.drawingBufferWidth,
            clientHeight: gl.drawingBufferHeight,
          } as any,
          context: gl,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.setPixelRatio(Math.min(gl.drawingBufferWidth / 300, 2.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 2. Setup Scene & Camera
        const scene = new THREE.Scene();

        const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
        const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        camera.position.set(0, 1.2, 3.5);

        // 3. Studio Lighting Rig
        // Soft ambient fill
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        // Key light with soft shadow
        const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
        keyLight.position.set(3, 5, 4);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        scene.add(keyLight);

        // Cool rim / backlight to pop character silhouette
        const rimLight = new THREE.DirectionalLight(0x70a5ff, 1.5);
        rimLight.position.set(-3, 3, -3);
        scene.add(rimLight);

        // Ground shadow plane (subtle contact shadow)
        const shadowPlaneGeo = new THREE.PlaneGeometry(3, 3);
        const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.18 });
        const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.01;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // Subtle ground grid
        const gridHelper = new THREE.GridHelper(6, 12, 0x444466, 0x222233);
        gridHelper.position.y = -0.01;
        scene.add(gridHelper);

        // 4. Load 3D Character Model
        setLoadingProgress('Loading 3D character...');
        const manager = new ModelManager((meta) => {
          onMetadataLoaded?.(meta);
        });
        modelManagerRef.current = manager;

        const model = await manager.loadModel(modelAsset, 'RobotExpressive.glb');
        scene.add(model);

        // Trigger initial action
        manager.setCharacterAction(action);

        setIsLoading(false);

        // 5. Render Loop with smooth camera spherical coords
        let lastTime = Date.now();
        const targetLookAt = new THREE.Vector3(0, 0.9, 0);

        const renderLoop = () => {
          animFrameRef.current = requestAnimationFrame(renderLoop);

          const now = Date.now();
          const delta = (now - lastTime) / 1000;
          lastTime = now;

          // Update animation mixer
          manager.update(delta);

          // Update camera based on touch gesture state
          const gesture = controlsRef.current.getState();
          const phi = gesture.rotateX;
          const theta = gesture.rotateY;
          const radius = gesture.distance;

          // Convert spherical coordinates to Cartesian
          camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
          camera.position.y = targetLookAt.y + radius * Math.cos(phi);
          camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
          camera.lookAt(targetLookAt);

          renderer.render(scene, camera);

          // Flush frame in expo-gl
          gl.endFrameEXP();
        };

        renderLoop();
      } catch (err: any) {
        console.error('[CharacterCanvas] Initialization failed:', err);
        setIsLoading(false);
        onError?.(err?.message || 'Failed to initialize 3D scene');
      }
    };

    useEffect(() => {
      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, []);

    const panResponder = controlsRef.current.createPanResponder();

    return (
      <View style={styles.container} {...panResponder.panHandlers}>
        <GLView style={styles.glView} onContextCreate={onContextCreate} />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>{loadingProgress}</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Deep slate space background
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});

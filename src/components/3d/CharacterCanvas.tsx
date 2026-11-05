// @refresh reset
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, AppState, TouchableOpacity, Dimensions, PixelRatio } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { TouchOrbitControls } from './GestureController';
import { ModelManager } from './ModelManager';
import { disposeObject } from '../../utils/modelHelpers';
import { CharacterAction, ModelMetadata } from '../../types';

// Keep this path fixed: replace the GLB file itself to change characters without source edits.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundledModel: number = require('../../../assets/models/RobotExpressive.glb');
const defaultModel = process.env.EXPO_PUBLIC_MODEL_URL || bundledModel;
export interface CharacterCanvasRef { resetCamera: () => void; playCustomClip: (name: string) => void }
interface Props { modelAsset?: number | string; action: CharacterAction; onMetadataLoaded?: (metadata: ModelMetadata) => void; onError?: (error: string) => void }

export const CharacterCanvas = forwardRef<CharacterCanvasRef, Props>(function CharacterCanvas(
  { modelAsset = defaultModel, action, onMetadataLoaded, onError }, ref,
) {
  const [controls] = useState(() => new TouchOrbitControls({ initialDistance: 4.5 }));
  const [panResponder] = useState(() => controls.createPanResponder());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const managerRef = useRef<ModelManager | null>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<() => void>(() => {});
  const generation = useRef(0);
  const active = useRef(AppState.currentState !== 'background');
  const layout = useRef({ width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.55 });
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; managerRef.current?.setCharacterAction(action); }, [action]);
  useImperativeHandle(ref, () => ({
    resetCamera: () => controls.reset(),
    playCustomClip: name => managerRef.current?.playClip(name),
  }), [controls]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      active.current = state === 'active';
      if (active.current) startRef.current();
      else if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    });
    return () => {
      subscription.remove(); cleanupRef.current();
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    cleanupRef.current();
    const token = ++generation.current;
    let renderer: THREE.WebGLRenderer | null = null;
    const scene = new THREE.Scene();
    const manager = new ModelManager(metadata => {
      if (token === generation.current) onMetadataLoaded?.(metadata);
    });
    managerRef.current = manager;
    let cancelled = false;
    let failed = false;
    const dispose = () => {
      if (cancelled) return;
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null; startRef.current = () => {};
      manager.dispose(); disposeObject(scene); scene.clear(); renderer?.dispose();
      if (managerRef.current === manager) managerRef.current = null;
    };
    cleanupRef.current = dispose;
    const showError = (error: unknown) => {
      if (cancelled || token !== generation.current) return;
      failed = true;
      const message = error instanceof Error ? error.message : 'Unable to render this model.';
      setIsLoading(false); setLoadError(message); onError?.(message);
      dispose();
    };
    try {
      setIsLoading(true); setLoadError(null);
      let width = Math.max(1, Math.round(layout.current.width * PixelRatio.get()));
      let height = Math.max(1, Math.round(layout.current.height * PixelRatio.get()));
      const canvas = { width, height, style: {}, addEventListener() {}, removeEventListener() {}, clientWidth: width, clientHeight: height };
      (gl as unknown as { canvas: typeof canvas }).canvas = canvas;
      renderer = new THREE.WebGLRenderer({ canvas: canvas as unknown as HTMLCanvasElement, context: gl, antialias: true, alpha: false });
      renderer.setPixelRatio(1); renderer.setSize(width, height, false);
      renderer.setClearColor(0x0f172a, 1);
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2));
      const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(3, 5, 4); scene.add(key);
      const rim = new THREE.DirectionalLight(0xa5b4fc, 1.5); rim.position.set(-3, 2, -2); scene.add(rim);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.45, depthWrite: false }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; scene.add(floor);
      const model = await manager.loadModel(modelAsset);
      if (cancelled || token !== generation.current) return;
      scene.add(model); manager.setCharacterAction(actionRef.current);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const target = bounds.getCenter(new THREE.Vector3());
      const fit = () => {
        const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
        const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
        controls.setInitialDistance(Math.max(size.y / (2 * Math.tan(vertical)), size.x / (2 * Math.tan(horizontal))) * 1.35 + size.z / 2);
      };
      fit(); setIsLoading(false);
      let lastTime = performance.now();
      const render = () => {
        frameRef.current = null;
        if (cancelled || failed || !active.current) return;
        try {
          const now = performance.now(); manager.update((now - lastTime) / 1000); lastTime = now;
          const nextWidth = Math.max(1, Math.round(layout.current.width * PixelRatio.get()));
          const nextHeight = Math.max(1, Math.round(layout.current.height * PixelRatio.get()));
          if (nextWidth > 0 && nextHeight > 0 && (width !== nextWidth || height !== nextHeight)) {
            width = nextWidth; height = nextHeight;
            camera.aspect = width / height; camera.updateProjectionMatrix(); renderer!.setSize(width, height, false); fit();
          }
          const { rotateX: phi, rotateY: theta, distance } = controls.getState();
          camera.position.set(target.x + distance * Math.sin(phi) * Math.sin(theta), target.y + distance * Math.cos(phi), target.z + distance * Math.sin(phi) * Math.cos(theta));
          camera.lookAt(target);
          // Expo presents/resizes native framebuffers outside Three's state cache.
          // Rebind the current default surface before every frame.
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          renderer!.render(scene, camera);
          gl.endFrameEXP();
          // Synchronize native submission so a slow/software GPU cannot accumulate
          // minutes of stale animation frames and retain disposed GL contexts.
          const glError = gl.getError();
          if (glError !== gl.NO_ERROR) throw new Error(`3D rendering failed (GL ${glError}). Retry loading.`);
          frameRef.current = requestAnimationFrame(render);
        } catch (error) { showError(error); }
      };
      startRef.current = () => {
        if (!cancelled && !failed && frameRef.current === null && active.current) { lastTime = performance.now(); render(); }
      };
      startRef.current();
    } catch (error) { showError(error); }
  };

  return <View collapsable={false} style={styles.container} onLayout={event => { layout.current = event.nativeEvent.layout; }} {...panResponder.panHandlers}>
    <GLView collapsable={false} key={`${modelAsset}:${attempt}`} style={{ flex: 1 }} msaaSamples={0} onContextCreate={onContextCreate} />
    <View style={[styles.overlay, { opacity: isLoading ? 1 : 0 }]} pointerEvents="none" accessibilityElementsHidden={!isLoading} importantForAccessibility={isLoading ? "auto" : "no-hide-descendants"}><ActivityIndicator color="#818cf8" size="large" /><Text style={styles.text}>Loading character…</Text></View>
    {loadError && <View style={styles.overlay}>
      <Text style={styles.title}>Character unavailable</Text><Text style={styles.text}>{loadError}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { setLoadError(null); setIsLoading(true); setAttempt(value => value + 1); }}><Text style={styles.text}>Retry loading</Text></TouchableOpacity>
    </View>}
  </View>;
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { color: '#fca5a5', fontSize: 18, fontWeight: '700' },
  text: { color: '#e2e8f0', textAlign: 'center' },
  button: { backgroundColor: '#4338ca', padding: 16, borderRadius: 12 },
});

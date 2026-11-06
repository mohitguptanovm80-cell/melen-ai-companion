import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { normalizeModel, disposeObject } from '../../utils/modelHelpers';
import { CharacterAction, ModelMetadata } from '../../types';
import { NativeTextures } from './NativeTextures';
import { AnimationController } from './AnimationController';

export class ModelManager {
  private animator: AnimationController | null = null;
  private model: THREE.Group | null = null;
  private metadata: ModelMetadata | null = null;
  private disposed = false;
  private loadController = new AbortController();
  private textures = new NativeTextures(this.loadController.signal);
  constructor(private onMetadataUpdate?: (metadata: ModelMetadata) => void) {}

  async loadModel(assetModule: number | string): Promise<THREE.Group> {
    let uri: string;
    let fileName: string;
    if (typeof assetModule === 'number') {
      const asset = Asset.fromModule(assetModule);
      await asset.downloadAsync();
      uri = asset.localUri ?? asset.uri;
      fileName = `${asset.name}.${asset.type}`;
    } else {
      uri = assetModule;
      fileName = uri.split('/').pop()?.split('?')[0] || 'Character.glb';
    }
    if (this.disposed) throw new Error('Model loading cancelled.');
    let buffer: ArrayBuffer;
    if (uri.startsWith('file://') || uri.startsWith('/')) buffer = await new File(uri).arrayBuffer();
    else {
      const response = await fetch(uri, { signal: this.loadController.signal });
      if (!response.ok) throw new Error(`Model download failed (${response.status}).`);
      buffer = await response.arrayBuffer();
    }
    const gltf = await new GLTFLoader().register(this.textures.plugin).parseAsync(buffer, uri.substring(0, uri.lastIndexOf('/') + 1));
    if (this.disposed) { disposeObject(gltf.scene); throw new Error('Model loading cancelled.'); }
    const motion = new THREE.Group();
    const normalized = new THREE.Group();
    normalized.add(gltf.scene); motion.add(normalized);
    this.model = motion;
    const boundingBox = normalizeModel(normalized);
    let triangleCount = 0;
    gltf.scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        triangleCount += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
      }
    });
    // Assign stable unique names to unnamed/duplicate clips so every embedded clip is selectable.
    const names = new Set<string>();
    gltf.animations.forEach((clip, index) => {
      const base = clip.name || `Animation ${index + 1}`;
      let name = base; let suffix = 2;
      while (names.has(name)) name = `${base} ${suffix++}`;
      clip.name = name; names.add(name);
    });
    this.metadata = { fileName, boundingBox, triangleCount, animations: gltf.animations.map(clip => clip.name), activeClipName: null, isLoaded: true };
    this.animator = new AnimationController(gltf.scene, motion, gltf.animations, activeClipName => {
      if (this.metadata) {
        this.metadata = { ...this.metadata, activeClipName };
        this.onMetadataUpdate?.(this.metadata);
      }
    });
    return motion;
  }
  setCharacterAction(action: CharacterAction) {
    if (action === 'walk') this.animator?.walk();
    else this.animator?.setTalking(action === 'talk');
  }
  playClip(name: string) { this.animator?.preview(name); }
  update(delta: number) { this.animator?.update(delta); }
  dispose() {
    this.disposed = true; this.loadController.abort();
    this.animator?.dispose(); this.animator = null;
    if (this.model) { this.model.removeFromParent(); disposeObject(this.model); this.model = null; }
    this.textures.dispose();
    this.metadata = null;
  }
}

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { normalizeModel, resolveAnimationClips, ResolvedAnimations } from '../../utils/modelHelpers';
import { CharacterAction, ModelMetadata } from '../../types';

export interface LoadModelResult {
  scene: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  metadata: ModelMetadata;
}

export class ModelManager {
  private loader: GLTFLoader;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private resolvedAnimations: ResolvedAnimations = {
    idleName: null,
    talkName: null,
    allNames: [],
  };
  private currentActionType: CharacterAction = 'idle';
  private modelScene: THREE.Group | null = null;
  private onMetadataUpdate?: (metadata: ModelMetadata) => void;

  constructor(onMetadataUpdate?: (metadata: ModelMetadata) => void) {
    this.loader = new GLTFLoader();
    this.onMetadataUpdate = onMetadataUpdate;
  }

  /**
   * Loads a .glb model from an Expo asset module (or remote URL)
   */
  public async loadModel(
    assetModule: number | string,
    fileName: string = 'RobotExpressive.glb'
  ): Promise<THREE.Group> {
    try {
      let arrayBuffer: ArrayBuffer;

      if (typeof assetModule === 'number') {
        // Local bundled asset
        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        arrayBuffer = decode(base64);
      } else {
        // Remote URL or local URI
        const base64 = await FileSystem.readAsStringAsync(assetModule, {
          encoding: FileSystem.EncodingType.Base64,
        });
        arrayBuffer = decode(base64);
      }

      return new Promise<THREE.Group>((resolve, reject) => {
        this.loader.parse(
          arrayBuffer,
          '',
          (gltf: GLTF) => {
            const scene = gltf.scene;
            this.modelScene = scene;

            // Enable shadows & clean materials
            scene.traverse((child: THREE.Object3D) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // 1. Auto-center and normalize scale to fit viewport perfectly
            const boundingBox = normalizeModel(scene, 2.2);

            // 2. Setup Animation Mixer & Actions
            this.actions.clear();
            if (gltf.animations && gltf.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(scene);
              this.resolvedAnimations = resolveAnimationClips(gltf.animations);

              gltf.animations.forEach((clip: THREE.AnimationClip) => {
                if (this.mixer) {
                  const action = this.mixer.clipAction(clip);
                  this.actions.set(clip.name, action);
                }
              });

              // Start default idle animation
              if (this.resolvedAnimations.idleName) {
                this.playClip(this.resolvedAnimations.idleName, 0.2);
              }
            } else {
              this.mixer = null;
              this.resolvedAnimations = { idleName: null, talkName: null, allNames: [] };
            }

            // Emit metadata for UI badge/HUD
            const metadata: ModelMetadata = {
              fileName,
              animations: this.resolvedAnimations.allNames,
              activeClipName: this.resolvedAnimations.idleName,
              boundingBox,
              isLoaded: true,
            };
            this.onMetadataUpdate?.(metadata);

            resolve(scene);
          },
          (error: unknown) => {
            console.error('[ModelManager] Parse error:', error);
            reject(error);
          }
        );
      });
    } catch (err) {
      console.error('[ModelManager] Load error:', err);
      throw err;
    }
  }

  /**
   * Smoothly cross-fade to an animation clip by name
   */
  public playClip(clipName: string, duration: number = 0.3) {
    const nextAction = this.actions.get(clipName);
    if (!nextAction) {
      console.warn(`[ModelManager] Clip "${clipName}" not found in model.`);
      return;
    }

    if (this.currentAction === nextAction) {
      return;
    }

    if (this.currentAction) {
      this.currentAction.fadeOut(duration);
    }

    nextAction.reset().fadeIn(duration).play();
    this.currentAction = nextAction;
  }

  /**
   * High-level switch between 'idle' and 'talk' states
   */
  public setCharacterAction(action: CharacterAction) {
    this.currentActionType = action;

    if (!this.mixer) return;

    if (action === 'idle') {
      if (this.resolvedAnimations.idleName) {
        this.playClip(this.resolvedAnimations.idleName, 0.35);
      }
    } else if (action === 'talk') {
      if (this.resolvedAnimations.talkName) {
        this.playClip(this.resolvedAnimations.talkName, 0.35);
      }
    }
  }

  /**
   * Update mixer delta per frame (called in requestAnimationFrame loop)
   */
  public update(delta: number) {
    if (this.mixer) {
      this.mixer.update(delta);
    } else if (this.modelScene) {
      // Procedural breathing fallback if model contains 0 animations
      const time = Date.now() * 0.002;
      this.modelScene.position.y += Math.sin(time) * 0.0005;
    }
  }

  public getResolvedAnimations(): ResolvedAnimations {
    return this.resolvedAnimations;
  }
}

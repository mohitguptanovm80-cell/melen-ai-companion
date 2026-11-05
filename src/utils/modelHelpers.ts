import * as THREE from 'three';
import type { ModelMetadata } from '../types';

export interface ResolvedAnimations { idleName: string | null; talkName: string | null; allNames: string[] }

// Normalize a wrapper, preserving the imported root's authored transforms and animation bindings.
export function normalizeModel(scene: THREE.Object3D, targetSize = 2.2): ModelMetadata['boundingBox'] {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  if (box.isEmpty()) throw new Error('This GLB contains no visible mesh.');
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
  scene.scale.multiplyScalar(scale);
  scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  scene.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(scene);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const fittedCenter = fitted.getCenter(new THREE.Vector3());
  return { width: fittedSize.x, height: fittedSize.y, depth: fittedSize.z,
    center: { x: fittedCenter.x, y: fittedCenter.y, z: fittedCenter.z } };
}

export function resolveAnimationClips(animations: THREE.AnimationClip[]): ResolvedAnimations {
  const allNames = animations.map(clip => clip.name);
  const find = (patterns: RegExp[]) => patterns.map(pattern => allNames.find(name => pattern.test(name))).find(Boolean) ?? null;
  // Prefer a true idle, then a standing pose. Never choose Dance/Death just because it is first.
  const idleName = find([/idle/i, /breathe|rest|wait/i, /standing|stand|default/i]);
  const talkName = find([/talk|speak|dialogue|chat/i, /gesture/i, /^yes$/i, /wave/i]);
  return { idleName, talkName, allNames };
}

export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    });
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((object as THREE.SkinnedMesh).skeleton);
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
  skeletons.forEach(skeleton => skeleton.dispose());
}

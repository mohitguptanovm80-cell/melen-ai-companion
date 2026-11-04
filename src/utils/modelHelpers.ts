import * as THREE from 'three';
import { ModelMetadata } from '../types';

export interface ResolvedAnimations {
  idleName: string | null;
  talkName: string | null;
  allNames: string[];
}

/**
 * Automatically centers and scales any 3D model regardless of its authoring units.
 * This guarantees that swapping the .glb model requires zero code changes.
 */
export function normalizeModel(
  scene: THREE.Object3D,
  targetHeight: number = 2.5
): ModelMetadata['boundingBox'] {
  // Compute precise world bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Shift model so its ground is at y = 0 and horizontally centered
  scene.position.x -= center.x;
  scene.position.y -= box.min.y; // Pin feet to ground level (y = 0)
  scene.position.z -= center.z;

  // Scale model proportionally to standard viewport height
  const maxDimension = Math.max(size.x, size.y, size.z);
  if (maxDimension > 0) {
    const scaleFactor = targetHeight / maxDimension;
    scene.scale.setScalar(scaleFactor);
  }

  // Count triangles for debug stats
  let triangles = 0;
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        triangles += mesh.geometry.index
          ? mesh.geometry.index.count / 3
          : mesh.geometry.attributes.position.count / 3;
      }
    }
  });

  return {
    width: Number(size.x.toFixed(2)),
    height: Number(size.y.toFixed(2)),
    depth: Number(size.z.toFixed(2)),
    center: {
      x: Number(center.x.toFixed(2)),
      y: Number(center.y.toFixed(2)),
      z: Number(center.z.toFixed(2)),
    },
  };
}

/**
 * Fuzzy animation discovery: Dynamically maps animation clips to 'idle' and 'talk'.
 * Ensures any external .glb model automatically works without hardcoded animation names.
 */
export function resolveAnimationClips(
  animations: THREE.AnimationClip[]
): ResolvedAnimations {
  if (!animations || animations.length === 0) {
    return { idleName: null, talkName: null, allNames: [] };
  }

  const allNames = animations.map((clip) => clip.name);

  // Search patterns with prioritized regex
  const idleRegex = /(idle|stand|wait|rest|breathe|default)/i;
  const talkRegex = /(talk|speak|dialogue|chat|gesture|yes|wave|mouth)/i;

  // Find idle candidate
  let idleName = allNames.find((name) => idleRegex.test(name)) || null;

  // Find talk candidate (preferring one distinct from idle)
  let talkName =
    allNames.find((name) => talkRegex.test(name) && name !== idleName) || null;

  // Fallback defaults if no naming patterns match
  if (!idleName && allNames.length > 0) {
    idleName = allNames[0];
  }
  if (!talkName && allNames.length > 1) {
    talkName = allNames[1];
  } else if (!talkName) {
    talkName = idleName;
  }

  return {
    idleName,
    talkName,
    allNames,
  };
}

import * as THREE from 'three';
import type { GLTFParser, GLTFLoaderPlugin } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { File, Paths } from 'expo-file-system';
import { Image } from 'react-native';
import { decode } from 'base64-arraybuffer';

// GLTFLoader's default image path needs DOM/Blob APIs. Expo GL instead accepts
// an image descriptor with localUri, width and height for native texture upload.
export class NativeTextures {
  private files = new Set<File>();
  private disposed = false;
  constructor(private signal: AbortSignal) {}
  plugin = (parser: GLTFParser): GLTFLoaderPlugin => ({
    name: 'MELEN_native_images',
    loadTexture: async (index: number) => {
      const definition = parser.json.textures[index];
      const image = parser.json.images?.[definition.source];
      if (!image) throw new Error('This texture requires an unsupported image decoder. Export PNG or JPEG textures.');
      let bytes: Uint8Array;
      let mime = image.mimeType as string | undefined;
      if (image.bufferView !== undefined) bytes = new Uint8Array(await parser.getDependency('bufferView', image.bufferView));
      else if (typeof image.uri === 'string' && image.uri.startsWith('data:')) {
        const match = /^data:(image\/(?:png|jpeg));base64,(.*)$/s.exec(image.uri);
        if (!match) throw new Error('Use PNG or JPEG images in the GLB.');
        mime = match[1]; bytes = new Uint8Array(decode(match[2]));
      } else if (typeof image.uri === 'string') {
        const uri = THREE.LoaderUtils.resolveURL(image.uri, parser.options.path);
        if (uri.startsWith('file://')) bytes = await new File(uri).bytes();
        else {
          const response = await fetch(uri, { signal: this.signal });
          if (!response.ok) throw new Error(`Texture download failed (${response.status}).`);
          bytes = new Uint8Array(await response.arrayBuffer());
        }
        mime ??= /\.png(?:\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg';
      } else throw new Error('The model contains an invalid image.');
      if (mime !== 'image/png' && mime !== 'image/jpeg') throw new Error('Use PNG or JPEG textures for this mobile viewer.');
      if (this.disposed || this.signal.aborted) throw new Error('Model loading cancelled.');
      const file = new File(Paths.cache, `melen-${Date.now()}-${Math.random().toString(36).slice(2)}.${mime === 'image/png' ? 'png' : 'jpg'}`);
      file.write(bytes); this.files.add(file);
      const { width, height } = await Image.getSize(file.uri);
      if (this.disposed || this.signal.aborted) throw new Error('Model loading cancelled.');
      const texture = new THREE.Texture({ localUri: file.uri, width, height });
      texture.flipY = false;
      const sampler = parser.json.samplers?.[definition.sampler] ?? {};
      const wraps: Record<number, THREE.Wrapping> = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
      const filters: Record<number, THREE.MinificationTextureFilter> = { 9728: THREE.NearestFilter, 9729: THREE.LinearFilter, 9984: THREE.NearestMipmapNearestFilter, 9985: THREE.LinearMipmapNearestFilter, 9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter };
      texture.wrapS = wraps[sampler.wrapS] ?? THREE.RepeatWrapping;
      texture.wrapT = wraps[sampler.wrapT] ?? THREE.RepeatWrapping;
      texture.magFilter = sampler.magFilter === 9728 ? THREE.NearestFilter : THREE.LinearFilter;
      texture.minFilter = filters[sampler.minFilter] ?? THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = texture.minFilter !== THREE.NearestFilter && texture.minFilter !== THREE.LinearFilter;
      texture.name = definition.name ?? image.name ?? '';
      texture.needsUpdate = true;
      parser.associations.set(texture, { textures: index });
      return texture;
    },
  });
  dispose() {
    this.disposed = true;
    this.files.forEach(file => { try { if (file.exists) file.delete(); } catch { /* OS cache cleanup is also available. */ } });
    this.files.clear();
  }
}

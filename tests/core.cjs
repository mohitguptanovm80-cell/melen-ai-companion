const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const THREE = require('three');
const { resolveAnimationClips, normalizeModel } = require('../.test-build/src/utils/modelHelpers');
const { AnimationController } = require('../.test-build/src/components/3d/AnimationController');
const { configureBackend, configureProvider, clearProvider, getProvider, providerRequest } = require('../.test-build/src/services/providerService');
const { AIService } = require('../.test-build/src/services/aiService');
const clip = name => new THREE.AnimationClip(name, 0.5, [new THREE.NumberKeyframeTrack('.rotation[x]', [0, 0.5], [0, 0.1])]);
const tick = (controller, seconds) => { for (let i = 0; i < seconds * 60; i++) controller.update(1 / 60); };

test('animation discovery never defaults to death or dance and prioritizes genuine speech', () => {
  assert.deepEqual(resolveAnimationClips(['Dance','Death','Idle','Wave','Talking'].map(clip)), { idleName: 'Idle', talkName: 'Talking', allNames: ['Dance','Death','Idle','Wave','Talking'] });
  assert.equal(resolveAnimationClips([clip('Death')]).idleName, null);
  assert.equal(resolveAnimationClips([]).talkName, null);
});
test('normalization grounds and centers a replacement with authored transforms', () => {
  const root = new THREE.Group(); const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 7, 2));
  mesh.position.set(12, -5, 9); mesh.scale.setScalar(2); root.add(mesh);
  const result = normalizeModel(root);
  assert.ok(Math.abs(result.height - 2.2) < 1e-6);
  const box = new THREE.Box3().setFromObject(root);
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new THREE.Vector3()).x) < 1e-6);
  assert.equal(mesh.scale.x, 2);
});
test('preview completes into idle; speaking overrides preview and returns to idle', () => {
  const root = new THREE.Group(), motion = new THREE.Group(); motion.add(root);
  let active;
  const controller = new AnimationController(root, motion, ['Idle','Jump','Talking'].map(clip), name => active = name);
  assert.equal(active, 'Idle'); controller.preview('Jump'); assert.equal(active, 'Jump');
  tick(controller, 1); assert.equal(active, 'Idle');
  controller.preview('Jump'); controller.setTalking(true); assert.equal(active, 'Talking');
  controller.preview('Jump'); assert.equal(active, 'Talking');
  tick(controller, 2); assert.equal(active, 'Talking');
  controller.setTalking(false); tick(controller, 1); assert.equal(active, 'Idle'); controller.dispose();
});
test('static fallback stays bounded over many cycles and settles after speech', () => {
  const root = new THREE.Group(), motion = new THREE.Group(); motion.add(root);
  const controller = new AnimationController(root, motion, [], () => {});
  controller.setTalking(true); tick(controller, 120);
  assert.ok(Math.abs(motion.position.y) <= 0.035);
  controller.setTalking(false); tick(controller, 3); assert.ok(Math.abs(motion.rotation.y) < 0.001);
  controller.dispose();
});
test('actual supplied GLB has 14 playable clips and supports preview completion', async () => {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const data = fs.readFileSync('assets/models/RobotExpressive.glb');
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  assert.equal(gltf.animations.length, 14);
  const motion = new THREE.Group(); motion.add(gltf.scene); let active;
  const controller = new AnimationController(gltf.scene, motion, gltf.animations, name => active = name);
  controller.walk();
  tick(controller, 0.5);
  assert.equal(active, 'Walking');
  assert.ok(Math.abs(motion.position.x) > 0.01);
  controller.setTalking(true);
  assert.equal(active, 'Yes');
  controller.setTalking(false);
  tick(controller, 1);
  assert.equal(active, 'Idle');
  assert.ok(Math.abs(motion.position.x) < 0.001);
  for (const animation of gltf.animations) {
    controller.preview(animation.name); tick(controller, animation.duration + 0.7); assert.equal(active, 'Idle');
  }
  controller.dispose();
});
test('provider rejects insecure configuration and forgets credentials', () => {
  assert.throws(() => configureProvider({ baseUrl: 'http://example.com', apiKey: 'test', chatModel: 'test', transcriptionModel: 'test' }));
  clearProvider(); assert.throws(getProvider, /Voice setup/);
});
test('real request path sends text, rejects blank replies and exposes offline/auth errors', async () => {
  const originalFetch = global.fetch;
  configureProvider({ baseUrl: 'https://example.com/v1', apiKey: 'test-only', chatModel: 'test', transcriptionModel: 'test' });
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://example.com/v1/chat/completions');
      assert.equal(JSON.parse(options.body).messages[1].content, 'Actual user words');
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Actual reply' } }] }) };
    };
    assert.equal(await new AIService().generateReply('Actual user words', new AbortController().signal), 'Actual reply');
    global.fetch = async () => ({ ok: true, json: async () => ({ choices: [] }) });
    await assert.rejects(new AIService().generateReply('Hi', new AbortController().signal), /empty reply/);
    global.fetch = async () => { throw new TypeError('Network request failed'); };
    await assert.rejects(providerRequest('/test', '{}', new AbortController().signal), /internet/);
    global.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(providerRequest('/test', '{}', new AbortController().signal), /rejected access/);
  } finally { global.fetch = originalFetch; clearProvider(); }
});

test('backend mode keeps Azure credentials out of mobile requests and preserves actionable errors', async () => {
  const originalFetch = global.fetch;
  assert.throws(() => configureBackend('http://example.com/api/ai'));
  configureBackend('http://192.168.1.2:8081/api/ai', true);
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, 'http://192.168.1.2:8081/api/ai/chat/completions');
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers['api-key'], undefined);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Live backend reply' } }] }) };
    };
    assert.equal(await new AIService().generateReply('Hello', new AbortController().signal), 'Live backend reply');
    global.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'Azure deployment unavailable.' } }) });
    await assert.rejects(new AIService().generateReply('Hello', new AbortController().signal), /Azure deployment unavailable/);
  } finally { global.fetch = originalFetch; clearProvider(); }
});

test('AI server discovery supports native debug builds without an Expo manifest', () => {
  const { resolveBackendUrl } = require('../.test-build/src/utils/backendUrl');
  assert.equal(resolveBackendUrl(undefined, undefined, 'http://localhost:8081/index.bundle?platform=android', true), 'http://localhost:8081/api/ai');
  assert.equal(resolveBackendUrl(undefined, '192.168.1.3:8081', undefined, true), 'http://192.168.1.3:8081/api/ai');
  assert.equal(resolveBackendUrl(undefined, 'unused:8081', 'https://example.exp.direct/index.bundle', true), 'https://example.exp.direct/api/ai');
  assert.equal(resolveBackendUrl(undefined, undefined, 'file:///app/index.bundle', true), null);
  assert.equal(resolveBackendUrl(undefined, '192.168.1.3:8081', 'http://localhost:8081/index.bundle', false), null);
  assert.equal(resolveBackendUrl('https://api.example.com/api/ai', undefined, undefined, false), 'https://api.example.com/api/ai');
});

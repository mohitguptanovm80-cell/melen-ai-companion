const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, globals = {}) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(result.outputText, { exports, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error(`Unexpected test dependency: ${name}`);
  }, console, AbortController, Error, setTimeout, clearTimeout, setInterval, clearInterval, ...globals });
  return exports;
}

test('orbit -> pinch -> orbit resets baselines and reset preserves configured distance', () => {
  const { TouchOrbitControls } = load('src/components/3d/GestureController.ts', { 'react-native': { PanResponder: { create: handlers => handlers } } });
  const controls = new TouchOrbitControls({ initialDistance: 4 });
  const handlers = controls.createPanResponder();
  const event = (...points) => ({ nativeEvent: { touches: points.map(([pageX, pageY]) => ({ pageX, pageY })) } });
  handlers.onPanResponderGrant(event([10,10]));
  handlers.onPanResponderMove(event([20,10]));
  const angle = controls.getState().rotateY;
  handlers.onPanResponderMove(event([20,10], [120,10]));
  handlers.onPanResponderMove(event([20,10], [220,10]));
  assert.equal(controls.getState().distance, 2);
  handlers.onPanResponderMove(event([200,10]));
  assert.equal(controls.getState().rotateY, angle);
  handlers.onPanResponderMove(event([210,10]));
  assert.ok(controls.getState().rotateY > angle);
  controls.reset(); assert.equal(controls.getState().distance, 4);
});

test('recording returns actual provider text, sets multipart correctly, and releases resources', async () => {
  let released = 0, deleted = 0, request;
  class Recorder { uri = 'file:///recording.m4a'; async prepareToRecordAsync(options) { assert.ok(options); } record() {} async stop() {} release() { released++; } }
  class Form { parts = []; append(...part) { this.parts.push(part); } }
  class ServiceError extends Error {}
  const { SpeechToTextService } = load('src/services/speechToTextService.ts', {
    'expo-audio': { AudioModule: { AudioRecorder: Recorder }, RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } }, requestRecordingPermissionsAsync: async () => ({ granted: true }), setAudioModeAsync: async () => {} },
    'expo-file-system': { File: class { exists = true; delete() { deleted++; } } },
    'react-native': { Linking: { openSettings: async () => {} } },
    './providerService': { ServiceError, getProvider: () => ({ transcriptionModel: 'test' }), providerRequest: async (...args) => { request = args; return { text: 'These are my actual words.' }; } },
  }, { FormData: Form });
  const service = new SpeechToTextService(); await service.startRecording();
  assert.equal(await service.stopAndTranscribe(new AbortController().signal), 'These are my actual words.');
  assert.equal(request[0], '/audio/transcriptions'); assert.equal(request[1].parts[0][1].type, 'audio/mp4');
  assert.equal(request.length, 3); assert.equal(released, 1); assert.equal(deleted, 1);
});

test('permission denial is distinct from network failure and never starts recording', async () => {
  let created = false;
  class ServiceError extends Error { constructor(message, kind) { super(message); this.kind = kind; } }
  const { SpeechToTextService } = load('src/services/speechToTextService.ts', {
    'expo-audio': { AudioModule: { AudioRecorder: class { constructor() { created = true; } } }, RecordingPresets: {}, requestRecordingPermissionsAsync: async () => ({ granted: false }), setAudioModeAsync: async () => {} },
    'expo-file-system': {}, 'react-native': { Linking: {} },
    './providerService': { ServiceError, getProvider: () => ({}) },
  });
  await assert.rejects(new SpeechToTextService().startRecording(), error => error.kind === 'permission');
  assert.equal(created, false);
});

test('speech promise follows real callbacks and cancellation stops playback', async () => {
  let callbacks, starts = 0, stops = 0;
  const { TextToSpeechService } = load('src/services/textToSpeechService.ts', { 'expo-speech': {
    stop: async () => { stops++; }, speak: (text, value) => { callbacks = value; }, isSpeakingAsync: async () => true,
  } });
  const service = new TextToSpeechService(); const controller = new AbortController();
  let done = false; const pending = service.speak('Hello', controller.signal, () => starts++).then(() => { done = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(starts, 0); assert.equal(done, false);
  callbacks.onStart(); assert.equal(starts, 1); assert.equal(done, false);
  controller.abort(); await pending; assert.equal(stops, 2);
  callbacks.onStart(); assert.equal(starts, 1); // stale platform events cannot restart animation
});

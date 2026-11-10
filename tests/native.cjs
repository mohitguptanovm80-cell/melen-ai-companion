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
    'expo-audio': { AudioModule: { AudioRecorder: Recorder }, RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } }, getRecordingPermissionsAsync: async () => ({ granted: true }), requestRecordingPermissionsAsync: async () => { throw new Error('Already granted: do not reopen the Android permission activity.'); }, setAudioModeAsync: async () => {} },
    'expo-file-system': { File: class { exists = true; type = 'audio/mp4'; constructor(uri) { this.uri = uri; } async bytes() { return new Uint8Array([1, 2, 3]); } delete() { deleted++; } } },
    'react-native': { Linking: { openSettings: async () => {} } },
    './providerService': { ServiceError, getProvider: () => ({ transcriptionModel: 'test' }), providerRequest: async (...args) => { request = args; return { text: 'These are my actual words.' }; } },
  }, { FormData: Form });
  const service = new SpeechToTextService(); await service.startRecording();
  assert.equal(await service.stopAndTranscribe(new AbortController().signal), 'These are my actual words.');
  assert.equal(request[0], '/audio/transcriptions'); assert.equal(request[1].parts[0][1].type, 'audio/mp4');
  assert.equal(typeof request[1].parts[0][1].bytes, 'function');
  assert.equal(request[1].parts[0][2], 'recording.m4a');
  assert.equal(request.length, 3); assert.equal(released, 1); assert.equal(deleted, 1);
});

test('permission denial is distinct from network failure and never starts recording', async () => {
  let created = false;
  const promptStates = [];
  let promptOpen = false;
  class ServiceError extends Error { constructor(message, kind) { super(message); this.kind = kind; } }
  const { SpeechToTextService } = load('src/services/speechToTextService.ts', {
    'expo-audio': { AudioModule: { AudioRecorder: class { constructor() { created = true; } } }, RecordingPresets: {}, getRecordingPermissionsAsync: async () => ({ granted: false }), requestRecordingPermissionsAsync: async () => { assert.equal(promptOpen, true); return { granted: false }; }, setAudioModeAsync: async () => {} },
    'expo-file-system': {}, 'react-native': { Linking: {} },
    './providerService': { ServiceError, getProvider: () => ({}) },
  });
  await assert.rejects(new SpeechToTextService().startRecording(pending => { promptOpen = pending; promptStates.push(pending); }), error => error.kind === 'permission');
  assert.deepEqual(promptStates, [true, false]);
  assert.equal(created, false);
});

test('speech promise follows real callbacks and cancellation stops playback', async () => {
  let callbacks, starts = 0, stops = 0;
  let playbackMode;
  const { TextToSpeechService } = load('src/services/textToSpeechService.ts', {
    'expo-audio': { setAudioModeAsync: async mode => { playbackMode = mode; } },
    'expo-speech': {
    stop: async () => { stops++; }, speak: (text, value) => { callbacks = value; }, isSpeakingAsync: async () => true,
  } });
  const service = new TextToSpeechService(); const controller = new AbortController();
  let done = false; const pending = service.speak('Hello', controller.signal, () => starts++).then(() => { done = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(starts, 0); assert.equal(done, false);
  assert.equal(playbackMode.allowsRecording, false);
  assert.equal(playbackMode.playsInSilentMode, true);
  assert.equal(playbackMode.shouldRouteThroughEarpiece, false);
  assert.equal(callbacks.useApplicationAudioSession, true);
  assert.equal(callbacks.volume, 1);
  callbacks.onStart(); assert.equal(starts, 1); assert.equal(done, false);
  controller.abort(); await pending; assert.equal(stops, 2);
  callbacks.onStart(); assert.equal(starts, 1); // stale platform events cannot restart animation
});

test('cancelling while audio mode is preparing never starts speech', async () => {
  let ready, spoken = false;
  const { TextToSpeechService } = load('src/services/textToSpeechService.ts', {
    'expo-audio': { setAudioModeAsync: () => new Promise(resolve => { ready = resolve; }) },
    'expo-speech': { stop: async () => {}, speak: () => { spoken = true; } },
  });
  const controller = new AbortController();
  const pending = new TextToSpeechService().speak('Hello', controller.signal, () => {});
  await new Promise(resolve => setImmediate(resolve));
  controller.abort(); ready(); await pending;
  assert.equal(spoken, false);
});

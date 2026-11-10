# Melen AI Companion

An Expo SDK 58 / React Native application for the Melen AI mobile developer assignment. One TypeScript codebase targets Android and iOS. A native Three.js viewport loads the supplied RobotExpressive GLB, supports drag/pinch gestures, previews embedded clips, and reacts during spoken AI replies.

## Run

Use the Node version supported by the installed Expo SDK (Node 22.13+ is a suitable baseline) and npm.

```sh
npm ci
npx expo start
```

For native development builds with local platform tooling:

```sh
npm run ios
npm run android
```

The app uses Expo Router (`src/app`), `expo-gl`, `expo-asset`, `expo-file-system`, `expo-audio`, and `expo-speech`. Native directories are generated and ignored by Git. After native dependency or plugin changes, rebuild the development app. Web is not an acceptance target for this assignment.

## Azure AI connection

The project uses the client’s Azure resource at `https://melenai-resource.openai.azure.com/openai/v1`, with `melenai-gpt-6-luna` for chat and `gpt-realtime-2.1-mini` for voice recognition. The actual credential lives in ignored `.env`, outside source control and the mobile bundle. On another development machine, copy `.env.example` to `.env` and supply the key.

Run `npm start` and reload the mobile app. The app automatically uses the Expo development server’s address; no key entry or speaker-test step is needed. The phone and computer must share a trusted network (or the same Expo tunnel). Send a typed message or tap the microphone, speak, and tap again to finish. Recordings finish automatically after 60 seconds. Replies are displayed and spoken using the device voice. Cancel with the microphone button while processing or speaking.

`server/azure.cjs` runs inside Metro and calls Azure with the server-only key. It accepts only chat and transcription operations, rejects browser origins, limits uploads, and cleans temporary audio files. Its bundled server FFmpeg converts native M4A recordings to 24 kHz mono PCM, then sends them through Azure Realtime over WebSocket. The Realtime model is instructed to transcribe speech verbatim; its text goes to the chat deployment. It is not sent to the incompatible `/audio/transcriptions` Azure endpoint. There are no canned replies or random transcripts. Failures remain visible and retryable.

### Connected Android debug APK over USB

Native debug APKs without Expo Dev Launcher use the JavaScript bundle origin when Expo's manifest does not provide a server address. For the connected phone, the ignored `.env` currently explicitly sets `EXPO_PUBLIC_AI_BACKEND_URL=http://localhost:8083/api/ai` and uses a separate, loopback-only AI server:

```sh
npm run ai:usb
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8083 tcp:8083
npm start
```

Keep both servers running and the phone connected by USB. Reload Melen after changing the address. The AI server listens only on your computer's loopback interface. Remove the `EXPO_PUBLIC_AI_BACKEND_URL` override to return to automatic discovery, or replace it with your deployed HTTPS backend for release builds. A connected OPPO Android debug APK successfully sent a typed question and displayed the live Azure response after this fix.

This bridge is for a trusted local development network. It is not an authenticated public production server. For an installed release, deploy these operations behind the client’s authenticated backend and configure `EXPO_PUBLIC_AI_BACKEND_URL` before building. The key must stay on that backend. An APK cannot use the local `.env` secret directly. Device microphone/speaker checks remain necessary on Android and iOS.

## Replace the character without source-code edits

Replace **the contents of `assets/models/RobotExpressive.glb`**, retaining that filename. Restart Metro with `npx expo start --clear`; rebuild the APK for a distributable updated asset. No TypeScript or JavaScript edits are needed.

Alternatively, copy `.env.example` to `.env.local`, set `EXPO_PUBLIC_MODEL_URL` to a public HTTPS GLB, and restart/rebuild. That value is public; never put credentials there.

Models are normalized using a wrapper so authored transforms and animation bindings remain intact. The camera fits the normalized bounds. Every embedded clip appears in the inspector, including unnamed clips assigned stable labels. Idle selection prioritizes `Idle`, then rest/breathing/waiting/standing names. Speech selection prioritizes talking/speaking clips, then gestures, `Yes`, or `Wave`. Unknown clips are not blindly selected as idle. Missing idle/speech clips use a bounded procedural sway/bob; this does not create missing skeletal animation.

With a voice provider connected, say **Book my ticket from Jaipur to Pune**. While the provider prepares the reply, the robot plays its embedded Walking clip and takes a small step across the viewport. When speech starts, it crossfades to its speaking gesture. Completion, cancellation, and errors restore idle. This demonstrates the travel request visually. Actual ticket fulfillment requires the client backend.

The sample has 14 clips and Angry/Surprised/Sad facial morph targets. Its `Yes` gesture is used during speech because it has no dedicated talking clip. Clip previews play once and return to the base state. Speech overrides previews; previews are ignored during speech. Transitions crossfade without changing clip speed. Active-clip highlighting reflects the mixer state.

Use a standard self-contained glTF 2.0 GLB. Decoder-compressed assets (Draco/KTX2/Meshopt) need an appropriate native decoder integration before use. PNG/JPEG textures use a native Expo GL image adapter, including embedded buffer-view images. The supplied asset is untextured; a client's textured model must still be validated on both native platforms. Arbitrary rigs, animation names, materials, or vendor extensions cannot be guaranteed by file extension alone.

## Architecture and scope

- `src/app/`: Expo Router entry and layout.
- `App.tsx`: companion screen and provider setup access.
- `src/components/3d/CharacterCanvas.tsx`: GL lifecycle, lighting, fitted camera, foreground rendering, load retry.
- `ModelManager.ts`: asset loading, normalization, metadata, and GPU resource disposal.
- `AnimationController.ts`: clip selection, previews, crossfades, speech priority, procedural fallback.
- `GestureController.ts`: one/two-finger transitions, bounded orbit/zoom, camera reset.
- `src/hooks/useVoiceAssistant.ts`: microphone, transcript, AI reply, speech, cancellation, and error flow.
- `src/services/`: provider HTTP, recording/transcription, AI response, and platform TTS.

Accurate phoneme lip-sync, general AI action execution, navigation between product features, and a production backend are outside the PDF's requested scope. This demonstration implements visible speech-time animation, not lip-sync. Performance and appearance require device testing; no unmeasured frame-rate claim is made.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

The automated checks cover actual GLB animation playback, one-shot completion, speech priority, replacement-model normalization, bounded procedural motion, provider configuration, request formatting, and failure propagation. They do not replace microphone/speaker/GPU tests on devices.

## Build deliverables

Sign in to your Expo account and link/create the project when prompted:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile ios-simulator
```

`eas.json` defines an installable Android APK and an iOS simulator build. Download the resulting APK and share it with the Git repository and screen recordings. The simulator profile does not require device provisioning. Building for a physical iPhone requires Apple signing credentials.

## Acceptance recording checklist

Record the following on Android **and** iOS. Do not show API credentials in the recording.

- Cold launch, visible character, default idle, loading/error state as applicable.
- Orbit, pinch zoom, one-to-two-to-one-finger transition, camera reset.
- Open inspector, preview clips, verify return to idle.
- Ask an unscripted question by microphone; verify exact recognized speech, relevant reply, audible speech, visible reaction, and return to idle.
- Interrupt speech, then start another conversation.
- Deny microphone permission, recover through Settings, retry.
- Disable connectivity during a request: visible error, then successful retry after reconnecting.
- Background/resume during recording and speech; verify microphone/audio cleanup and responsive controls.
- Replace the bundled GLB without source edits; demonstrate framing and available animations.
- Run repeated conversations and inspect frame pacing/memory on representative devices.

Capture the Android APK, Android screen recording, iOS screen recording, and device/OS versions. **Full acceptance remains pending until live-provider and both-platform evidence are collected.**

## References

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Audio](https://docs.expo.dev/versions/v58.0.0/sdk/audio/)
- [Expo Speech](https://docs.expo.dev/versions/v58.0.0/sdk/speech/)
- [Android APK builds](https://docs.expo.dev/build-reference/apk/)
- [OpenAI transcription API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create)
- [OpenAI chat API](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [Client-specified sample model](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive)

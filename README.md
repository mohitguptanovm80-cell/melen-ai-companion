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

## Connect a real voice provider

1. Open **Voice setup** in the app.
2. Enter an HTTPS OpenAI-compatible API base URL, API key, chat model, and transcription model.
3. Select **Use for this session**. Configuration is validated locally; provider access is verified by the first request.
4. Tap the microphone, grant permission, speak, then tap again to finish. Recordings automatically finish after 60 seconds.
5. The actual transcription appears on screen. The AI response is displayed and spoken; animation begins when speech starts and returns to idle when speech ends.
6. Tap during processing to cancel, or during speech to interrupt. In an error state, tap to retry. Permission errors offer a Settings shortcut.

The defaults retain the original project's OpenAI models (`gpt-4o-mini` and `whisper-1`). Model access, availability, billing, and compatible endpoint support depend on your provider. They are editable in the app.

The key is held only in JavaScript memory, cleared on disconnect or process exit, and never written to files, persistent storage, environment variables, logs, or the app bundle. Enter a dedicated evaluation credential on your own device. The setup form identifies the destination before sending audio or text. This direct-provider mode is for the assignment evaluation; production should use the client's authenticated backend. No new backend has been implemented.

There are **no random transcripts or canned AI fallbacks**. Missing configuration, empty speech, invalid credentials, quota failures, connection failures, and timeouts produce visible recoverable errors. TTS uses the platform voice. On physical iPhones, disable Silent Mode when demonstrating Expo Speech.

The adapter uses these OpenAI-compatible contracts:

- `POST {baseUrl}/audio/transcriptions`: multipart `file` (M4A audio) and `model`; response `{ "text": "..." }`.
- `POST {baseUrl}/chat/completions`: JSON `model` and `messages`; response `choices[0].message.content`.
- Bearer authorization for both. `providerService.ts` owns configuration, cancellation, timeout, and HTTP errors.

Once the client shares its backend contract, adapt these service methods without changing the avatar or conversation UI.

## Replace the character without source-code edits

Replace **the contents of `assets/models/RobotExpressive.glb`**, retaining that filename. Restart Metro with `npx expo start --clear`; rebuild the APK for a distributable updated asset. No TypeScript or JavaScript edits are needed.

Alternatively, copy `.env.example` to `.env.local`, set `EXPO_PUBLIC_MODEL_URL` to a public HTTPS GLB, and restart/rebuild. That value is public; never put credentials there.

Models are normalized using a wrapper so authored transforms and animation bindings remain intact. The camera fits the normalized bounds. Every embedded clip appears in the inspector, including unnamed clips assigned stable labels. Idle selection prioritizes `Idle`, then rest/breathing/waiting/standing names. Speech selection prioritizes talking/speaking clips, then gestures, `Yes`, or `Wave`. Unknown clips are not blindly selected as idle. Missing idle/speech clips use a bounded procedural sway/bob; this does not create missing skeletal animation.

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

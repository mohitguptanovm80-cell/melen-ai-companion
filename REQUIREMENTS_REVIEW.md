# Client requirement review — 6 November 2026

Source: `/Users/ankit/Documents/3d.pdf`. This is an implementation and verification report, not a guarantee of client acceptance.

| PDF requirement | Implementation | Evidence / remaining validation |
| --- | --- | --- |
| Shared Android/iOS application | Expo SDK 58, React Native, Expo Router | iOS native build succeeded; the corrected optimized Android release launched and rendered on an Android 15 ARM64 emulator. Physical-device testing remains. |
| Render supplied RobotExpressive GLB | `CharacterCanvas.tsx`, `ModelManager.ts` | Robot visibly rendered in both iOS and Android simulators. Actual asset has 3,237 triangles and 14 clips. |
| Rotate / zoom | `GestureController.ts` | Orbit/reset observed on iOS; automated pinch transition test passes. Physical two-finger zoom still needs testing. |
| Embedded animations and idle | `AnimationController.ts` | Actual GLB tests pass; Jump preview observed on iOS and returned to Idle. Crossfades, one-shot previews, speech priority implemented. |
| Replace GLB without source edits | Fixed bundled path or public model URL | Wrapper normalization tested. Replace file contents while retaining filename. Client model and texture compatibility need native validation. |
| Microphone → real transcript | `speechToTextService.ts` | Native recording and multipart transcription implemented; mocked native lifecycle tests pass. No live credential was supplied, so real recorded transcription is unverified. |
| AI answer and spoken reply | `aiService.ts`, `textToSpeechService.ts` | Real provider requests and native TTS implemented. No canned fallback. Live end-to-end verification remains. |
| Visible reaction during speech, then idle | Hook + animation controller | TTS callbacks control speaking state; sample uses Yes gesture. Automated tests pass. Live voice evidence remains. |
| Permission / connectivity errors | Services, hook, error banner | Missing-provider recovery observed; denial/network failure paths tested with mocks. Device permission and offline recovery tests remain. |
| Delivery: code, README, APK, Android/iOS recordings | Workspace code, README, EAS configuration | Final Android build: https://expo.dev/accounts/mohit14-2/projects/melen-ai-companion/builds/e135d3b8-b6ba-4e0f-9d75-84e48d8cb5c3 . Full voice recordings on both platforms remain outstanding. |

The November 5 APK crashed during GLView creation on Android. Its optimized DEX omitted the constructor required by Expo. Release version code 2 preserves the Expo GL classes via the build configuration. The Jaipur-to-Pune prompt now triggers Walking during processing, then the speaking gesture and idle. Actual ticket fulfillment belongs to the client backend.

## Checks completed

- TypeScript: passes.
- ESLint: passes.
- Automated tests: 11 pass (actual model animation tests plus mocked native/provider tests).
- Expo Doctor: 20/20 checks passed during implementation.
- iOS native build and simulator launch: succeeded.
- Session-only provider form: observed on iOS; credential input is masked and not persisted.

## Submission blockers and priorities

1. Enter a valid evaluation credential in **Voice setup** on your device. Record an unscripted microphone → transcript → AI reply → audible speech → animation → idle sequence. Never expose the credential in a recording.
2. Install the latest APK and verify Android rendering, pinch gestures, microphone, TTS, cancellation, permission recovery, offline retry, and background/resume behavior. An APK build alone does not establish runtime correctness.
3. Check smoothness on physical iOS/Android devices. Profiling showed the available iOS simulator using software rasterization. Frame submission is synchronized to prevent stale queued frames, but simulator rendering remains slow; no FPS claim is made. Measure physical-device performance before submission.
4. Validate any replacement client GLB, especially textured or compressed assets. PNG/JPEG native texture loading is implemented; Draco/KTX2/Meshopt decoder support is not included.
5. Capture full Android and iOS acceptance videos using the README checklist, then share the repository and final APK.

Do not describe this as “100% verified” yet. Accurate lip-sync, new backend development, and general AI action execution are not required by this PDF and have not been added.

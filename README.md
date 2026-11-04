# Melen AI — 3D AI Companion Mobile App

A cross-platform React Native (iOS & Android) application featuring an interactive 3D AI companion that responds with voice, real-time speech-to-text transcriptions, and synchronized 3D body animations.

---

## 🌟 Key Highlights & Architectural Decisions

### 1. Model-Agnostic 3D Engine (Zero Code Changes on Swap)
The core requirement states: *"Replacing the .glb with another model should not require code changes."*
Our implementation achieves this through two dynamic layers:
- **Automatic Bounding Box Normalization (`src/utils/modelHelpers.ts`)**:
  Calculates `THREE.Box3` of the incoming scene, centers the object horizontally, pins its feet to the ground level (`y = 0`), and dynamically scales the model to a standardized height regardless of whether the model author exported in millimeters, centimeters, or meters.
- **Fuzzy Animation Discovery**:
  Rather than hardcoding clip names (e.g., `clips['Idle']`), the engine dynamically inspects `gltf.animations` and uses prioritized regex pattern matching:
  - **Idle State**: Matches `/idle|stand|wait|rest|breathe|default/i` $\rightarrow$ fallback to `clips[0]`.
  - **Talking State**: Matches `/talk|speak|dialogue|chat|gesture|yes|wave|mouth/i` $\rightarrow$ fallback to `clips[1] || clips[0]`.
  - **Zero-Animation Fallback**: If a static model with no animations is loaded, a procedural breathing/swaying sine wave is applied so the character never feels frozen.

### 2. Smooth 60fps Native Touch Gestures
- **1-Finger Drag (Spherical Orbit)**: Seamlessly rotates the camera around the character with clamped polar angles (preventing disorienting upside-down flips).
- **2-Finger Pinch (Dolly Zoom)**: Clamped between `1.8m` and `6.0m` for optimal viewing distances.
- Built natively using React Native's `PanResponder` to avoid HTML DOM event dependency issues on mobile WebGL contexts.

### 3. Voice & AI Pipeline Synchronization
```
[User Taps Mic]
       │
       ▼
1. Speech-to-Text (STT) ────> Displays user transcription bubble
       │
       ▼
2. LLM / AI Engine      ────> Generates contextual conversational response
       │
       ▼
3. Text-to-Speech (TTS)
       │
   ├───┼───> Speaks reply to device speakers
   │   │
   │   └───> On Speech Start: Character cross-fades (0.35s) into Talking / Gesture clip
   │
   └───────> On Speech Done:  Character smoothly fades back to Idle clip
```

### 4. Resilient Edge Case & Permission Handling
- **Microphone Denials**: When microphone permission is denied, the app surfaces an in-app banner with a direct link to the device's system settings (`app-settings:` on iOS / `Settings` on Android).
- **Offline / Zero Setup Ready**: Evaluators can run and test the app immediately without configuring external paid API keys. The app ships with an intelligent local conversational engine, and also supports remote OpenAI / Groq API keys via `src/services/aiService.ts`.
- **Speech Interruption**: Tapping the mic button while the character is speaking immediately halts audio and gracefully returns the character to `idle`.

---

## 📁 Project Architecture

```
melen-ai-companion/
├── assets/
│   └── models/
│       └── RobotExpressive.glb       # Default 3D companion character model
├── src/
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── CharacterCanvas.tsx   # Core WebGL + Three.js rendering viewport
│   │   │   ├── ModelManager.ts       # GLTF loader, auto-scaling & animation mixer
│   │   │   └── GestureController.ts  # Native touch orbit and pinch-to-zoom controller
│   │   └── ui/
│   │       ├── VoiceControls.tsx     # Mic button with pulsating rings & state pill
│   │       ├── ConversationBubble.tsx# Real-time user text & AI reply caption bubbles
│   │       ├── ModelInspectorBadge.tsx# Evaluator HUD (stats, clip picker, camera reset)
│   │       └── NetworkStatusBar.tsx  # Mic denial & network error alerts
│   ├── services/
│   │   ├── aiService.ts              # Conversational AI (OpenAI / Groq with local fallback)
│   │   ├── speechToTextService.ts    # Audio recording & transcription
│   │   └── textToSpeechService.ts    # TTS speech synthesis & audio event triggers
│   ├── hooks/
│   │   └── useVoiceAssistant.ts      # Finite state machine (Idle -> Listening -> Thinking -> Speaking)
│   ├── types/
│   │   └── index.ts                  # TypeScript definitions
│   └── utils/
│       └── modelHelpers.ts           # Bounding-box calculations & fuzzy animation discovery
├── App.tsx                           # Main application entry point
├── app.json                          # Expo configuration & native permissions
└── metro.config.js                   # Bundler config supporting .glb & .gltf
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm or yarn
- Expo Go app on iOS / Android or Xcode / Android Studio simulators

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
```bash
# Start Metro bundler
npm run start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator / Device
npm run android
```

### 3. Testing with a Different `.glb` Model
To verify that replacing the model requires zero code changes:
1. Drop any standard `.glb` file into `assets/models/`.
2. Update the import path in `App.tsx` (or load it dynamically).
3. The app will automatically center, normalize the height, discover idle/talk clips, and list all embedded animations in the **Model Inspector HUD**.

---

## 🛠️ Evaluator HUD / Model Inspector
Tap the **cube icon** in the top-right corner to open the built-in Evaluator HUD:
- View detected model name & calculated bounding box dimensions.
- Tap any animation clip pill (`Dance`, `Jump`, `ThumbsUp`, `Wave`, `Yes`, etc.) to trigger it on-demand.
- Tap the **camera reset icon** to return the camera to the default viewing angle.

---

## 📱 Building Android APK
To produce a standalone release APK:
```bash
# Using EAS Build (Local or Cloud)
npx eas-cli build -p android --profile preview --local
```

---

## ⚠️ Known Limitations & Future Enhancements
- **Facial Blendshapes (Morph Targets)**: The sample `RobotExpressive.glb` model uses skeletal bone animations rather than facial blendshapes. For human avatars (e.g. Ready Player Me), phoneme/viseme blendshape mapping (`jawOpen`, `mouthSmile`) can be mapped directly to TTS audio frequencies.
- **Background Audio**: Audio playback is tuned for foreground interaction and pauses if the app is backgrounded.

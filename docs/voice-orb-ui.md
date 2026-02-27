# Voice Orb UI

## Overview
`VoiceOrb` is a premium visual layer for the existing GreenCart voice assistant flow. It does not change intent parsing, STT lifecycle, or action execution.

## Files
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/VoiceOrb.tsx`
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/VoiceOrbScreen.tsx`
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/useVoiceEnergy.ts`

## Behavior
- Background: layered pastel gradients using GreenCart tones.
- Orb: glass-like circle with animated fluid blobs and shimmer while processing.
- Transcript: live partial/final transcript displayed in large premium typography.
- Controls:
  - Main seed mic button uses push-to-talk (hold to listen, release to process).
  - Secondary pause button cancels listening.

## Motion model
- `useVoiceEnergy` creates a normalized envelope (`0..1`) from state + transcript cadence.
- Attack/release smoothing:
  - fast rise on new partial transcript while listening
  - slower decay to avoid jitter
- `VoiceOrb` maps this energy to pulse and blob motion intensity.

## Skia usage
- `VoiceOrb` tries to use `@shopify/react-native-skia` at runtime.
- If Skia is not installed, it falls back to a pure React Native/Reanimated visual without breaking voice features.

## Flags
- `VOICE_ORB_UI=true` or `EXPO_PUBLIC_VOICE_ORB_UI=true` enables the orb screen variant.
- When flag is off, `VoiceAssistantScreen` keeps using `VoiceAssistantDock`.

## Tuning
In `VoiceOrb.tsx`:
- Orb speed by state: `speedForStatus()`
- Blob colors/opacities: `styles.blobA|blobB|blobC`
- Processing shimmer intensity: `shimmerStyle`

In `useVoiceEnergy.ts`:
- Attack/release constants: `ATTACK_MS`, `RELEASE_MS`
- Base energy by status: `baseForStatus()`

# organicApp React Native base

Skeleton inicial para migracion incremental desde Ionic/Angular.

## Requisitos
- Node 20+
- npm 10+
- Xcode/Android Studio segun plataforma

## Setup
```bash
cd rn-app
cp .env.example .env
npm install
```

## Run
```bash
npm run start
npm run ios
npm run android
```

## Estructura
- `src/app/navigation`: root/auth/tabs/stacks
- `src/features`: modulos por feature
- `src/services`: api/auth/storage
- `src/state`: Zustand stores
- `src/shared`: tokens y componentes base

## Estado actual
- Navegacion funcional (tabs + stacks) con flujo Home/Explorar/Carrito.
- Auth real con secure storage, refresh/retry 401 y guard de onboarding.
- Core commerce conectado (catalog/cart/checkout/create order).
- Orders list/detail + init payment base.
- Fase 5 en progreso: virtualizacion, cache de imagenes y hardening runtime.

## Operacion (Fase 5)
- Performance/QA checklist: `../docs/PHASE5_PERF_QA_CHECKLIST.md`
- Release runbook iOS/Android: `../docs/PHASE5_RELEASE_RUNBOOK.md`

## Voice Latency/Stability (iOS Dev Client)
- Arquitectura actual:
  - iOS (`PvVoiceProcessor`) captura micrófono con `VoiceProcessor` nativo y procesa Cheetah en nativo.
  - El bridge RN ya no transporta PCM para Cheetah en iOS; solo eventos de texto (`partial_text`, `final_text`) y diagnósticos.
  - Android mantiene el flujo previo JS (Cheetah en JS) como fallback.
- Parámetros de audio STT:
  - `sampleRate=16000`
  - `frameLength=512`
- Métricas emitidas:
  - `time_to_first_partial_ms`
  - `partial_event_rate`
  - `session_duration_ms`
  - `frames_emitted_native`
  - `mic_silent_frames_occurrences`

### Debug Checklist
1. Confirmar que iOS entra en modo nativo Cheetah (`native_cheetah_mode_enabled`).
2. Verificar `recording_started` con `engineRunning=true`.
3. Revisar `native_partial` y que `time_to_first_partial_ms < 600ms`.
4. Confirmar `native_final` con `transcriptLen > 0` al detener.
5. Si hay fallos de audio, inspeccionar `native_diagnostic` (`route_change`, `audio_restarted`, `settings_changed_recovery`) y contador `mic_silent_frames_occurrences`.

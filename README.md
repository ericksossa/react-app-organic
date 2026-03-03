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

## Feature Flags (env)
- Todas las flags se controlan por variables `EXPO_PUBLIC_FF_*` en `.env`.
- Valores soportados: `1/0`, `true/false`, `on/off`.
- Flags principales:
  - `EXPO_PUBLIC_FF_TAB_HOME`
  - `EXPO_PUBLIC_FF_TAB_CATALOG`
  - `EXPO_PUBLIC_FF_TAB_VOICE`
  - `EXPO_PUBLIC_FF_TAB_CART`
  - `EXPO_PUBLIC_FF_DRAWER`
  - `EXPO_PUBLIC_FF_AUTH`
  - `EXPO_PUBLIC_FF_ONBOARDING`
  - `EXPO_PUBLIC_FF_ORDERS`
  - `EXPO_PUBLIC_FF_CHECKOUT`
  - `EXPO_PUBLIC_FF_PRODUCT_DETAIL`

### Matriz recomendada por entorno
| Flag | development | preview | production |
|---|---:|---:|---:|
| `EXPO_PUBLIC_FF_TAB_HOME` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_TAB_CATALOG` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_TAB_VOICE` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_TAB_CART` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_DRAWER` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_AUTH` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_ONBOARDING` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_ORDERS` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_CHECKOUT` | 1 | 1 | 1 |
| `EXPO_PUBLIC_FF_PRODUCT_DETAIL` | 1 | 1 | 1 |

### Plantillas de entorno listas
- `.env.development.example`
- `.env.preview.example`
- `.env.production.example`

Uso sugerido:
```bash
cp .env.preview.example .env
```

Para rollback rápido de una funcionalidad en producción, cambia solo una flag a `0` (por ejemplo `EXPO_PUBLIC_FF_TAB_VOICE=0`) y despliega.

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

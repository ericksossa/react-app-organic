# Voice Assistant (Producción - incremental)

## Resumen
La implementación se migró de un componente monolítico a una arquitectura modular en:

- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui`
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/domain`
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/services`
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/state`
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/analytics`

Se mantiene `VoiceTab` y se añade integración push-to-talk en la SearchBar de catálogo.

## Cómo funciona
1. `VoiceSeedButton` (semilla) en SearchBar inicia/detiene escucha con push-to-talk.
2. `useVoiceAssistant` maneja estados: `idle`, `listening`, `processing`, `review`, `success`, `permission_denied`, `error`.
3. `PicovoiceSttProvider` usa Cheetah + Rhino + VoiceProcessor para transcripción/intención.
   - Contexto iOS actual: `assets/app_V1_es_ios_v4_0_0.rhn`
   - Sensitivity Rhino: `0.6`
   - Endpoint Rhino: `1.0s`
4. `parseIntent()` (determinista, sin LLM) mapea a intents MVP:
   - `SEARCH_PRODUCTS`
   - `ADD_TO_CART`
   - `REPEAT_LAST_ORDER` (stub)
   - `TRACK_ORDER` (stub)
5. Si hay ambigüedad/confianza baja, se exige confirmación con transcripción editable (`VoiceSheet`).

## Extender intents
Archivo: `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/domain/parseIntent.ts`

- Añadir regex de detección en `detectIntent`.
- Agregar entidades en `extract*`.
- Ajustar `confidenceFor` y `requiresConfirmation`.

## Privacidad y permisos
- Permiso de micrófono se solicita sólo al intentar voz.
- Se detiene audio al cancelar/cerrar.
- Analytics no incluye texto de transcripción.
- Eventos permitidos: tipo de intent, éxito, latencia, bucket de confianza, plataforma, motivo técnico.

## Telemetría
Módulo: `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/analytics/voiceEvents.ts`

Eventos base:
- `voice_permission_prompted`
- `voice_permission_denied`
- `voice_listen_started`
- `voice_listen_cancelled`
- `voice_processed`
- `voice_failed`

## Tests
### Ejecutar sólo tests de voz
```bash
cd /Users/erick/.codex/worktrees/9255/rn-app
npx jest src/features/voice-assistant/__tests__/parseIntent.test.ts src/features/voice-assistant/__tests__/useVoiceAssistant.test.ts
```

### Ejecutar suite completa
```bash
cd /Users/erick/.codex/worktrees/9255/rn-app
npm test
```

## Notas de integración
- Búsqueda: reutiliza estado existente de `CatalogScreen` (`query`, `categorySlug`).
- Carrito: reutiliza `useCartStore().addItem`.
- Repeat/Track: stubs controlados con mensaje “Pronto”.
- Config Rhino model path (si aplica): `EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH`.

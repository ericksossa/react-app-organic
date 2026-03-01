# Voice Assistant (GreenCart RN)

## Arquitectura actual
- `src/features/voice-assistant/domain`
  - `parseIntent.ts`: parser determinista en español (sin LLM).
  - `normalization.ts`: normalización de texto y parsing de cantidad/unidad.
  - `confidence.ts`: score final por `intent * entities * context`.
- `src/features/voice-assistant/services`
  - `VoiceClient.ts`: fachada de voz, permisos, arranque/parada/cancelación, hint Rhino opcional.
  - `stt/PicovoiceSttProvider.ts`: Cheetah + Rhino on-device.
- `src/features/voice-assistant/state`
  - `useVoiceAssistant.ts`: máquina de estados (idle/listening/processing/review/success/error), timeouts, cancelación y fallbacks.
  - `disambiguation.ts`: reducer para draft/candidatos.
- `src/features/voice-assistant/ui`
  - `VoiceSeedButton.tsx`, `VoiceSheet.tsx`, `VoiceAssistantDock.tsx`, `VoiceWaveform.tsx`.
- `src/features/voice-assistant/analytics`
  - `voiceEvents.ts`: solo metadata segura (sin transcripción).

## Confidence scoring
`confidence = min(1, scoreIntent * scoreEntities * scoreContext)`

- `scoreIntent`: prior por tipo + confianza base del parser.
- `scoreEntities`: penaliza slots faltantes (`ADD_TO_CART` sin producto cae fuerte).
- `scoreContext`:
  - `catalog`: máximo.
  - `voice`: intermedio.
  - `checkout`: bajo (fuerza revisión/manual).

Se usa para decidir:
- auto-ejecución: bucket `high` y sin ambigüedad.
- revisión: bucket `med/low`, baja confianza o candidatos múltiples.

Analytics solo registra bucket (`high/med/low`), nunca texto crudo.

## Desambiguación premium
Cuando el intent es `SEARCH_PRODUCTS` o `ADD_TO_CART`:
- Se resuelven candidatos con el search existente del catálogo (sin IDs hardcodeados).
- Si hay múltiples matches, `VoiceSheet` muestra `Top matches` (máximo 3).
- Seleccionar un candidato ejecuta directo.
- Si el usuario edita la transcripción en modo review:
  - debounce de 250ms
  - re-parse + nueva resolución de candidatos.

## Rhino gradual (feature flag)
Comportamiento default: parser actual (STT + reglas).

Flag opcional:
- `EXPO_PUBLIC_VOICE_RHINO_FIRST=1`

## Configuración segura de PicoVoice AccessKey
- No dejes el AccessKey hardcodeado en el código fuente.
- Configura `PICOVOICE_ACCESS_KEY` como secreto de entorno en CI/EAS (recomendado).
- Para pruebas locales, como fallback, puedes usar `EXPO_PUBLIC_PICOVOICE_ACCESS_KEY`.
- El app toma primero `extra.picovoiceAccessKey` (inyectado por `app.config.ts`) y luego el fallback local.

Con flag activo:
- `VoiceClient.stopListening({ rhinoFirst: true })` reporta `rhinoHint`.
- `useVoiceAssistant` compara Rhino vs parser y emite telemetría:
  - `rhino_used`
  - `rhino_success`
- Si Rhino no entiende, fallback automático a parser determinista.

## Rhino iOS Context (v4)
- Contexto iOS activo: `assets/app_V1_es_ios_v4_0_0.rhn`
- Modelo Rhino: configurar `EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH` si tu build no usa el modelo por defecto del SDK.
- Runtime key: `PICOVOICE_ACCESS_KEY` (preferido) o `EXPO_PUBLIC_PICOVOICE_ACCESS_KEY` para desarrollo local.
- Config de engine: `sensitivity=0.6`, `endpointDurationSec=1.0`.

### Intents/slots ejecutados por acción
- `BuscarProducto` / `search_products` con `slots.producto` -> búsqueda real de catálogo.
- `AgregarCarrito` / `add_to_cart` con `slots.producto` + `slots.cantidad` -> `addItem`.
- `AbrirCarrito` / `QuitarCarrito` / `VaciarCarrito` -> stubs con `TODO` cuando no existe ruta/store expuesto.

### Cómo actualizar Rhino context
1. Exporta el `.rhn` desde Picovoice Console.
2. Reemplaza el archivo en `assets/app_V1_es_ios_v4_0_0.rhn`.
3. Si cambió el modelo base, actualiza `EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH`.
4. Rebuild iOS (`expo run:ios` o EAS Build) para asegurar bundling del nuevo contexto.

## Privacidad y telemetría
- Transcripción se mantiene solo en memoria.
- No se loguea texto en analytics.
- Eventos disponibles:
  - `voice_permission_prompted`, `voice_permission_denied`
  - `voice_listen_started`, `voice_listen_cancelled`
  - `voice_processed`, `voice_failed`
  - `voice_intent_not_supported`
  - `voice_rhino_compared`

## UX y fallbacks
- Push-to-talk: mantener para escuchar, soltar para procesar.
- Preview parcial durante escucha.
- Cancelación segura al cerrar sheet, background o perder foco de pantalla.
- Intents no soportados (`REPEAT_LAST_ORDER`, `TRACK_ORDER`):
  - mensaje: `Aún no disponible`
  - CTA: `Open Orders`.

## Pruebas
- `src/features/voice-assistant/__tests__/normalization.test.ts`
- `src/features/voice-assistant/__tests__/confidence.test.ts`
- `src/features/voice-assistant/__tests__/disambiguation.test.ts`
- + tests existentes `parseIntent` y `useVoiceAssistant`.

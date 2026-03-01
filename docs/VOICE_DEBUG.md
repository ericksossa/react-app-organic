# Voice Pipeline Debug Checklist (GreenCart)

## Objetivo
Validar latencia, estabilidad y limpieza de sesión en el pipeline de voz (React Native + Picovoice + VoiceProcessor) en iOS/Android.

## Preparación
1. Ejecuta app en `expo dev-client` en iOS y Android.
2. Abre la pantalla/asistente de voz.
3. En modo `__DEV__`, observa logs `voice-debug` en Metro/Xcode/Android Studio.

## Checklist Manual
- [ ] Transcripción en vivo: el texto aparece mientras hablo.
- [ ] Latencia estable: los parciales se actualizan aproximadamente cada `~150ms`.
- [ ] Sin crecimiento de memoria: la cola no supera `MAX_QUEUE_FRAMES` y, si crece, aparece `queue_overflow_drop`.
- [ ] Fast mode: al subir backlog aparece `fastMode_on` y al drenar `fastMode_off`.
- [ ] Stop robusto: `stop()` retorna transcript (aunque vacío), hace flush y limpia listeners.
- [ ] Cancel robusto: `cancel()` deja estado en idle y sin listeners colgados.

## Prueba iOS (dispositivo físico)
1. Inicia escucha y habla 10-15 segundos continuos.
2. Verifica que exista `first_frame_received` al inicio.
3. Verifica que no haya sesiones con `frames=0` cuando el micrófono está activo.
4. Si detectas entrada silenciosa (frames con energía 0), confirma:
   - `silent_input_suspected` aparece como máximo una vez por sesión.
   - Se intenta un solo `audio_restart` (sin loop reentrante).
5. Repite ciclo `start -> stop -> start -> cancel` varias veces y verifica estabilidad.

## Prueba Android (dev-client)
1. Repite el mismo flujo continuo de 10-15 segundos.
2. Verifica que el transcript parcial se mantenga fluido sin saltos largos.
3. Fuerza backlog hablando muy rápido o en ambiente ruidoso y confirma:
   - Queue bounded (drop oldest).
   - Sin congelamiento de UI.

## Señales de éxito esperadas
- Menos jitter en texto parcial.
- Menor spam de logs por frame.
- Sin errores frecuentes `empty_transcript` por saturación.
- Menos casos `mic_silent_frames` derivados de overload.
- Métricas de sesión disponibles en `stop().debug` en `__DEV__`.

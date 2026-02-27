# Auditoría implementación previa (Voice Assistant)

## Alcance auditado
- UI y navegación: `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice/screens/VoiceAssistantScreen.tsx`, `/Users/erick/.codex/worktrees/9255/rn-app/src/features/catalog/screens/CatalogScreen.tsx`, `/Users/erick/.codex/worktrees/9255/rn-app/src/features/home/screens/HomeScreen.tsx`, `/Users/erick/.codex/worktrees/9255/rn-app/src/app/navigation/MainTabs.tsx`, `/Users/erick/.codex/worktrees/9255/rn-app/src/app/navigation/VoiceStackNavigator.tsx`.
- Catálogo/búsqueda/carrito: `/Users/erick/.codex/worktrees/9255/rn-app/src/services/api/catalogApi.ts`, `/Users/erick/.codex/worktrees/9255/rn-app/src/state/cartStore.ts`.
- Configuración runtime: `metro.config.js`, `assets/*.pv|*.ppn|*.rhn`, `app.config.ts`, `ios/Info.plist`.

## Cómo funciona hoy
1. Existe un tab independiente `VoiceTab` que renderiza `VoiceAssistantScreen`.
2. `VoiceAssistantScreen` (estado previo):
   - carga assets Picovoice con `expo-asset` (`cheetah_params_es.pv`, `coffee_maker_ios.rhn`, `porcupine_params_es.pv`, `hola_mercado.ppn`),
   - resuelve AccessKey/env,
   - montaba un único componente de voz.
3. El componente único de voz concentraba toda la lógica:
   - UI (FAB + modal + estados),
   - carga dinámica de SDK Picovoice,
   - permisos micrófono,
   - ciclo de audio con `@picovoice/react-native-voice-processor`,
   - STT con Cheetah,
   - intent con Rhino + fallback heurístico,
   - acciones catálogo/carrito con `getCatalog` + `useCartStore().addItem`,
   - TTS con `react-native-tts`/`expo-speech`.
4. Integración con búsqueda actual:
   - Home/Catalog tienen CTA para abrir `VoiceTab`,
   - no existe botón push-to-talk incrustado en SearchBar,
   - no hay “transcripción editable antes de ejecutar” en flujo de búsqueda.

## Limitaciones identificadas

### Arquitectura
- Alto acoplamiento: UI + dominio + infraestructura + side-effects en un solo archivo de voz (> 2k líneas).
- Difícil de testear: parser/estado/acciones no están aislados.
- Reutilización baja: no hay servicio reusable para SearchBar (solo modal/tab voz).

### UX/flujo
- El flujo principal de búsqueda por voz no está integrado directamente al campo de búsqueda.
- Falta confirmación editable por ambigüedad/confianza baja antes de ejecutar acciones.
- Estados de voz existen, pero están centrados en modal de voz, no embebidos en barra de búsqueda.

### Calidad/rendimiento
- Inicialización de motores y listeners compleja dentro del componente.
- Riesgo de regresión por cambios de API nativa (ya se observaron crashes de bridge iOS con Porcupine).
- Sin telemetría estructurada para medir latencia/success por intent.

### Privacidad/analytics
- Hay enfoque de privacidad en copy/UI, pero no existe módulo explícito de eventos no sensibles con contrato estable.

### Testing
- No hay tests de intents ni de la máquina de estados del asistente.
- No hay mocks dedicados para STT/TTS en la capa de voz.

## Puntos de extensión seguros
- Búsqueda: usar `CatalogScreen` (`query`, `categorySlug`, `getCatalog`) sin crear endpoint nuevo.
- Carrito: usar `useCartStore().addItem` con `variantId` ya resuelto.
- Navegación: conservar `VoiceTab` y sumar integración incremental en SearchBar.
- Voice engine existente: reutilizar SDK Picovoice ya instalado y funcional.

## Riesgos a controlar en la migración
- No romper el flujo actual de `VoiceTab` mientras se extraen servicios.
- Evitar dobles listeners de audio (`VoiceProcessor`) al coexistir componentes de voz.
- Mantener copys existentes de pantalla.
- No registrar transcripción completa en telemetría.

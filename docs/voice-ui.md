# Voice UI Redesign (Tab Voz)

## Qué cambió
Se rediseñó únicamente la capa visual del tab Voz sin alterar el flujo funcional de voz:
- Se mantiene `useVoiceAssistant` y la integración con Picovoice.
- Push-to-talk sigue igual (`pressIn` inicia, `pressOut` procesa).
- Se eliminó la cabecera legacy y se usa una sola card principal centrada.

## Estructura
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/VoiceCard.tsx`
  - Card principal con 3 zonas: texto superior, orb central y zona de estado/transcripción/controles.
  - Fondo único con gradiente vertical suave (verde/arena/lila), sin cortes duros.
  - Review inline editable (sin modal) para mantener estilo visual.
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/VoiceOrb.tsx`
  - Orb central “glass” por capas (240/180/130) con pulso/rotación por estado.
  - Reanimated para breathing, pulso en listening y giro en processing.
  - Si Skia está disponible, renderiza gradientes y capas más ricas.
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/VoiceDock.tsx`
  - Botón secundario izquierdo + mic principal circular (78) centrado.
  - El mic cambia de `#2C3240` a `#2CB67D` cuando está escuchando.
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice-assistant/ui/VoiceStatus.tsx`
  - Estado textual grande con transición de opacidad entre `idle/listening/processing`.
- `/Users/erick/.codex/worktrees/9255/rn-app/src/features/voice/screens/VoiceAssistantScreen.tsx`
  - Fondo global `#F4F6F2`, padding horizontal 20 y render de la card.

## Dependencias
- Reanimated: ya usada en el proyecto.
- Skia opcional para máxima fidelidad:
  - `@shopify/react-native-skia`

Si Skia no está instalada, la UI mantiene fallback visual con Views/gradientes suaves.

## Performance
- Animaciones se reducen/desactivan fuera de foco con `useFocusEffect`.
- Se respeta `reduce motion` para bajar intensidad.

## Accesibilidad
- Botones de pausa y micrófono tienen `accessibilityLabel` y `accessibilityRole`.

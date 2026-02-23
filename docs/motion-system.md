# GreenCart Motion System (RN / Expo)

## Nota de contexto
Este workspace es **React Native (Expo)**, no un proyecto React Web puro (Next/Vite).  
La implementación sigue la intención del brief usando `react-native-reanimated` y primitives reutilizables para móvil/web vía Expo.

## Principios
- La interfaz "respira", no "baila".
- Movimiento con propósito UX: orientación, feedback, jerarquía.
- Performance: animar solo `transform` y `opacity`.
- Accesibilidad: respetar `reduce motion` del sistema.

## Auditoría (Fase 0)
### Qué había
- `react-native-reanimated` ya estaba en uso.
- Motion localizado y no estandarizado en:
  - `src/features/home/screens/HomeScreen.tsx`
  - `src/features/catalog/screens/CatalogScreen.tsx`
  - `src/features/onboarding/screens/OnboardingScreen.tsx`
  - `src/app/navigation/AnimatedTabIcon.tsx`
  - `src/app/navigation/withTabSceneTransition.tsx`
- Curvas/duraciones hardcodeadas y sin source of truth.
- Sin soporte consistente para reduced motion.

### Qué se añadió
- Tokens centralizados de motion.
- Hook de reduced motion (`AccessibilityInfo`).
- Primitives reutilizables (`Reveal`, `MotionPressable`, `PageTransition`).
- Integración incremental en tabs, transiciones de página, onboarding, product cards y empty states.

### Por qué
- Coherencia visual + mantenibilidad + accesibilidad.

## Tokens
Archivo: `src/design/motion/tokens.ts`

### Duraciones (ms)
- `micro`: 140
- `short`: 240
- `base`: 420
- `narrative`: 720

### Easings
- `organic`: curva principal GreenCart
- `enter`: entradas
- `exit`: salidas

### Spring
- Spring suave para micro feedback, sin bounce excesivo.

## Primitives
### `Reveal`
Archivo: `src/design/motion/Reveal.tsx`

Uso:
```tsx
<Reveal delayMs={40}>
  <EmptyStateCard />
</Reveal>
```

### `MotionPressable`
Archivo: `src/design/motion/MotionPressable.tsx`

Uso:
```tsx
<MotionPressable pressedScale={0.98} onPress={onPress}>
  <AppText>Continuar</AppText>
</MotionPressable>
```

### `PageTransition`
Archivo: `src/design/motion/PageTransition.tsx`

Usado por:
- `src/app/navigation/withTabSceneTransition.tsx`

## Dónde se aplicó
- Onboarding/Hero
  - Breath sutil (scale/translateY)
  - Reveal de textos
  - CTA con press feedback
  - Reduced motion desactiva breath/transforms grandes
- Tabs/Nav
  - Tab selected pill/icon/label con tokens
  - Reduced motion reduce transforms
- Catálogo / cards
  - Zoom sutil de imagen + zoom on press
  - Micro pulse al agregar a canasta
  - Empty state con `Reveal`
- Estados vacíos
  - Canasta y Pedidos con `Reveal`
- Transiciones de escena
  - Wrapper tab scene migrado a primitive `PageTransition`

## Reduced Motion (manual QA)
### macOS
1. `System Settings` -> `Accessibility` -> `Display`
2. Activar `Reduce motion`

### iPhone / iOS
1. `Settings` -> `Accessibility` -> `Motion`
2. Activar `Reduce Motion`

### Windows 11
1. `Settings` -> `Accessibility` -> `Visual effects`
2. Desactivar `Animation effects`

## Qué cambia cuando Reduce Motion está activo
- Se desactivan:
  - breath/parallax suaves
  - transforms de entrada grandes
  - zoom/pulse decorativo
- Se mantiene:
  - opacidad/reveals mínimos o no-op rápidos

## Notas de performance
- Se usan `transform` + `opacity`.
- Se evita animar `height/width/top/left`.
- Staggers se mantienen suaves y limitados.

## Próximos pasos sugeridos
- Añadir badge de canasta con `pop` suave al agregar producto (si se incorpora contador visible en tabs).
- Crear variantes `RevealInList` para listas largas con control más granular.

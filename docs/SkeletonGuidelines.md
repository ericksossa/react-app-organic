# Skeleton Guidelines (React Native)

Esta guía define cómo usar placeholders de carga en GreenCart para que toda la app tenga una experiencia consistente.

## Objetivo
- Evitar saltos visuales durante carga de datos.
- Mantener una jerarquía clara entre estados: `loading`, `error`, `empty`, `ready`.
- Reutilizar presets y no duplicar bloques de skeleton por pantalla.

## Componentes base
- Base animada: [`src/shared/ui/AppSkeleton.tsx`](/Users/erick/Documents/rn-app/src/shared/ui/AppSkeleton.tsx)
- Presets reutilizables: [`src/shared/ui/SkeletonPresets.tsx`](/Users/erick/Documents/rn-app/src/shared/ui/SkeletonPresets.tsx)

## Presets disponibles
- `CatalogLoadingSkeleton`: catálogo principal.
- `ProductDetailLoadingSkeleton`: detalle de producto.
- `CartLoadingSkeleton`: lista de canasta.
- `AddressListLoadingSkeleton`: lista de direcciones en checkout.
- `ZoneListLoadingSkeleton`: zonas de entrega en onboarding.
- `OrderDetailLoadingSkeleton`: detalle de pedido.
- `OrdersListLoadingSkeleton`: listado de pedidos.

## Reglas de uso
1. Usa presets primero. Crea skeleton custom solo si no existe uno equivalente.
2. Muestra skeleton solo cuando hay `isLoading/loading` real de datos remotos.
3. Si hay contenido cacheado y refetch en background, no tapes el contenido con skeleton completo.
4. El texto de apoyo (ej. "Cargando...") puede mantenerse, pero el peso visual debe recaer en el skeleton.
5. Prioriza bloques que representen la estructura final (hero, filas, cards), no elementos decorativos.
6. En formularios modales (direcciones/zonas), usa presets compactos para evitar cambios bruscos de layout.

## Orden de estados recomendado
1. `loading`: skeleton.
2. `error`: card/mensaje de error + acción de reintento.
3. `empty`: estado vacío con CTA.
4. `ready`: contenido final.

## Accesibilidad y UX
- No ocultar acciones críticas si los datos ya están disponibles.
- Mantener contraste suficiente en dark/light.
- Evitar animaciones agresivas; usar pulso suave (implementado en `AppSkeleton`).

## Performance
- No renderizar más skeletons de los necesarios.
- Reusar presets para reducir duplicación y costo de render.
- Mantener `removeClippedSubviews`, `initialNumToRender` y `windowSize` en listas largas.

## Checklist para nuevos features
- [ ] ¿La pantalla tiene estado `loading` con skeleton?
- [ ] ¿Usa un preset existente?
- [ ] ¿El orden `loading -> error -> empty -> ready` está claro?
- [ ] ¿No hay parpadeo al pasar de skeleton a contenido?
- [ ] ¿Se validó en iOS y Android (tema dark/light)?

## Dónde extender
Si necesitas un preset nuevo:
1. Agrégalo en `src/shared/ui/SkeletonPresets.tsx`.
2. Usa nombres por dominio (`PaymentsLoadingSkeleton`, `ProfileLoadingSkeleton`).
3. Documenta su uso aquí en esta guía.

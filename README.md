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

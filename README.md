# Bóveda Burocrática

App móvil (Expo / React Native) para guardar y consultar tus documentos personales en el móvil,
protegida con huella o Face ID.

## Qué hace

- **Acceso con biometría**: huella / Face ID antes de ver nada (`expo-local-authentication`).
- **Panel de documentos** con visor y zoom para imágenes.
- **Autoactualización** desde GitHub Releases, sin tienda ni servidor.

## Stack

- [Expo](https://expo.dev) SDK 57 y React Native 0.86
- TypeScript y NativeWind
- `expo-secure-store` para el almacenamiento seguro

## Desarrollo

```bash
npm install
npx expo run:android      # build de desarrollo en el móvil (hay módulos nativos)
npx tsc --noEmit          # typecheck
```

## Licencia

MIT © Javier Cortés Vidal

# Bóveda Burocrática

App móvil (Expo / React Native) para guardar y consultar tus documentos personales en el móvil,
protegida con huella o Face ID.

## Qué hace

- **Acceso con biometría**: huella / Face ID antes de ver nada (`expo-local-authentication`).
- **Documentos cifrados en el móvil**: cada archivo se guarda cifrado con AES-256-GCM
  (`expo-crypto`), con la clave en el Keystore de Android / Keychain de iOS. Para verlo se
  descifra en memoria, nunca en un archivo en claro. Los documentos guardados por versiones
  anteriores (sin cifrar) se cifran solos al abrir la app.
- **Panel de documentos** con visor y zoom para imágenes.
- **Autoactualización** desde GitHub Releases, sin tienda ni servidor.

## Stack

- [Expo](https://expo.dev) SDK 57 y React Native 0.86
- TypeScript y NativeWind
- `expo-crypto` (AES-256-GCM) y `expo-secure-store` (Keystore / Keychain) para el cifrado local
- Jest (`jest-expo`) para los tests

## Desarrollo

```bash
npm install
npx expo run:android      # build de desarrollo en el móvil (hay módulos nativos)
npx tsc --noEmit          # typecheck
npm test                  # tests
```

## Licencia

MIT © Javier Cortés Vidal

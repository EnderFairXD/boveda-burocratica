import { useEffect } from 'react';
import * as Updates from 'expo-updates';

/**
 * Comprueba si hay una actualización OTA publicada con `eas update` y, si la hay,
 * la descarga y reinicia la app para aplicarla. No hace nada en desarrollo local
 * ni si el binario no tiene las actualizaciones habilitadas (p. ej. Expo Go).
 */
export function useOTAUpdates(): void {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    async function checkForUpdates() {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.warn('No se pudo comprobar actualizaciones OTA', error);
      }
    }

    checkForUpdates();
  }, []);
}

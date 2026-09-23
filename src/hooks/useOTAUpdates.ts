import { useCallback, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

export type OTAStatus = 'idle' | 'available' | 'downloading' | 'error';

interface UseOTAUpdatesResult {
  status: OTAStatus;
  applyUpdate: () => void;
}

/**
 * Comprueba si hay una actualización OTA publicada con `eas update` al abrir la app.
 * No la aplica sola: expone `status: 'available'` para que la UI muestre un aviso y
 * el usuario decida cuándo tocarlo (ver `applyUpdate`). No hace nada en desarrollo
 * local ni si el binario no tiene las actualizaciones habilitadas (p. ej. Expo Go).
 */
export function useOTAUpdates(): UseOTAUpdatesResult {
  const [status, setStatus] = useState<OTAStatus>('idle');

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let ignore = false;

    Updates.checkForUpdateAsync()
      .then((result) => {
        if (!ignore && result.isAvailable) {
          setStatus('available');
        }
      })
      .catch(() => {
        // Offline es el estado normal de esta app: fallamos en silencio.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    setStatus('downloading');
    Updates.fetchUpdateAsync()
      .then(() => Updates.reloadAsync())
      .catch(() => setStatus('error'));
  }, []);

  return { status, applyUpdate };
}

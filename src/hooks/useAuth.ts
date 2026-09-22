import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'unsupported';

interface UseAuthResult {
  status: AuthStatus;
  error: string | null;
  authenticate: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    setError(null);
    setStatus('checking');

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      setStatus('unsupported');
      setError('Este dispositivo no tiene soporte de autenticación biométrica.');
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      setStatus('unsupported');
      setError('No hay huella o Face ID registrados en este dispositivo.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea tu Bóveda Burocrática',
      cancelLabel: 'Cancelar',
    });

    if (result.success) {
      setStatus('authenticated');
    } else {
      setStatus('unauthenticated');
      setError('No se pudo verificar tu identidad. Inténtalo de nuevo.');
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return { status, error, authenticate };
}

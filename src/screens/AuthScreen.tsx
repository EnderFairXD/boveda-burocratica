import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export function AuthScreen({ children }: PropsWithChildren) {
  const { status, error, authenticate } = useAuth();

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-8">
      <Text className="mb-2 text-5xl">🔒</Text>
      <Text className="mb-1 text-2xl font-bold text-white">Bóveda Burocrática</Text>
      <Text className="mb-8 text-center text-slate-400">
        Tus documentos están protegidos. Verifica tu identidad para continuar.
      </Text>

      {status === 'checking' ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {error && <Text className="mb-4 text-center text-red-400">{error}</Text>}
          <Pressable
            onPress={authenticate}
            className="rounded-full bg-blue-600 px-8 py-3 active:bg-blue-700"
          >
            <Text className="text-base font-semibold text-white">Desbloquear</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

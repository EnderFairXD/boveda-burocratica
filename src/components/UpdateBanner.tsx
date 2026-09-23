import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { UpdateStatus } from '../hooks/useGithubUpdate';

interface UpdateBannerProps {
  status: UpdateStatus;
  latestVersion: string | null;
  onPress: () => void;
}

export function UpdateBanner({ status, latestVersion, onPress }: UpdateBannerProps) {
  if (status === 'idle') return null;

  if (status === 'downloading') {
    return (
      <View className="flex-row items-center justify-center gap-2 bg-indigo-600 px-4 py-3">
        <ActivityIndicator color="#fff" size="small" />
        <Text className="font-semibold text-white">Descargando actualización…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View className="bg-red-600/90 px-4 py-3">
        <Text className="text-center font-semibold text-white">
          No se pudo actualizar. Se volverá a intentar la próxima vez.
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-indigo-600 px-4 py-3 active:bg-indigo-700"
    >
      <Text className="font-semibold text-white">✨ Versión {latestVersion ?? 'nueva'} disponible</Text>
      <Text className="font-bold text-white underline">Actualizar</Text>
    </Pressable>
  );
}

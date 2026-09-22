import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  deleteDocument,
  generateDocumentId,
  getStoredDocuments,
  saveDocument,
  StoredDocument,
} from '../utils/fileManager';
import { DocumentViewer } from './DocumentViewer';
import { PromptModal } from '../components/PromptModal';

type PickerType = 'document' | 'image';

interface SingleCategoryConfig {
  key: string;
  label: string;
  icon: string;
  pickerType: PickerType;
  mode: 'single';
}

interface DualCategoryConfig {
  key: string;
  label: string;
  icon: string;
  pickerType: PickerType;
  mode: 'dual';
  slots: { key: string; label: string }[];
}

interface ListCategoryConfig {
  key: string;
  label: string;
  icon: string;
  pickerType: PickerType;
  mode: 'list';
  itemPlaceholder: string;
}

type CategoryConfig = SingleCategoryConfig | DualCategoryConfig | ListCategoryConfig;

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'dni',
    label: 'DNI',
    icon: '🪪',
    pickerType: 'image',
    mode: 'dual',
    slots: [
      { key: 'anverso', label: 'Anverso' },
      { key: 'reverso', label: 'Reverso' },
    ],
  },
  {
    key: 'carnet',
    label: 'Carné de Conducir',
    icon: '🚗',
    pickerType: 'image',
    mode: 'dual',
    slots: [
      { key: 'anverso', label: 'Anverso' },
      { key: 'reverso', label: 'Reverso' },
    ],
  },
  {
    key: 'cv',
    label: 'Currículum',
    icon: '📄',
    pickerType: 'document',
    mode: 'list',
    itemPlaceholder: 'Ej. CV Español',
  },
  { key: 'sanitaria', label: 'Tarjeta Sanitaria', icon: '🩺', pickerType: 'image', mode: 'single' },
];

interface PickAndSaveParams {
  id: string;
  category: string;
  slot?: string;
  label: string;
  pickerType: PickerType;
}

export function DashboardScreen() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewerDocument, setViewerDocument] = useState<StoredDocument | null>(null);
  const [cvPromptVisible, setCvPromptVisible] = useState(false);
  const [pendingListConfig, setPendingListConfig] = useState<ListCategoryConfig | null>(null);

  const loadDocuments = useCallback(async () => {
    const stored = await getStoredDocuments();
    setDocuments(stored);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const findDocument = useCallback(
    (id: string) => documents.find((doc) => doc.id === id) ?? null,
    [documents],
  );

  const findByCategory = useCallback(
    (category: string) => documents.filter((doc) => doc.category === category),
    [documents],
  );

  const pickAndSave = useCallback(
    async ({ id, category, slot, label, pickerType }: PickAndSaveParams) => {
      setBusyId(id);
      try {
        if (pickerType === 'document') {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
          });
          if (result.canceled || !result.assets?.[0]) return;

          const asset = result.assets[0];
          await saveDocument({ id, category, slot, label, sourceUri: asset.uri, originalFileName: asset.name });
        } else {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos para continuar.');
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (result.canceled || !result.assets?.[0]) return;

          const asset = result.assets[0];
          const fileName = asset.fileName ?? `${id}.jpg`;
          await saveDocument({ id, category, slot, label, sourceUri: asset.uri, originalFileName: fileName });
        }

        await loadDocuments();
      } catch (err) {
        Alert.alert('Error', 'No se pudo guardar el documento. Inténtalo de nuevo.');
      } finally {
        setBusyId(null);
      }
    },
    [loadDocuments],
  );

  const handleAddSingle = useCallback(
    (config: SingleCategoryConfig) =>
      pickAndSave({ id: config.key, category: config.key, label: config.label, pickerType: config.pickerType }),
    [pickAndSave],
  );

  const handleAddSlot = useCallback(
    (config: DualCategoryConfig, slot: { key: string; label: string }) =>
      pickAndSave({
        id: `${config.key}-${slot.key}`,
        category: config.key,
        slot: slot.key,
        label: `${config.label} · ${slot.label}`,
        pickerType: config.pickerType,
      }),
    [pickAndSave],
  );

  const openCvPrompt = useCallback((config: ListCategoryConfig) => {
    setPendingListConfig(config);
    setCvPromptVisible(true);
  }, []);

  const closeCvPrompt = useCallback(() => {
    setCvPromptVisible(false);
    setPendingListConfig(null);
  }, []);

  const handleCvLabelConfirm = useCallback(
    async (label: string) => {
      setCvPromptVisible(false);
      if (!pendingListConfig) return;

      const id = generateDocumentId(pendingListConfig.key);
      await pickAndSave({ id, category: pendingListConfig.key, label, pickerType: pendingListConfig.pickerType });
      setPendingListConfig(null);
    },
    [pendingListConfig, pickAndSave],
  );

  const handleDeleteListItem = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      await loadDocuments();
    },
    [loadDocuments],
  );

  return (
    <>
      <View className="flex-1 bg-slate-950">
        <LinearGradient
          colors={['#312e81', '#0f172a']}
          style={{ paddingTop: 64, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <Text className="text-3xl font-extrabold text-white">Mis documentos</Text>
          <Text className="mt-1 text-slate-300">Todo cifrado y guardado offline en este dispositivo.</Text>
        </LinearGradient>

        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-6">
          {CATEGORIES.map((config) => {
            if (config.mode === 'dual') {
              return (
                <View
                  key={config.key}
                  className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg shadow-black/40"
                >
                  <View className="mb-4 flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">
                      <Text className="text-2xl">{config.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-white">{config.label}</Text>
                      <Text className="text-slate-400">Anverso y reverso</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    {config.slots.map((slot) => {
                      const id = `${config.key}-${slot.key}`;
                      const saved = findDocument(id);
                      const isBusy = busyId === id;

                      if (saved) {
                        return (
                          <View
                            key={slot.key}
                            className="relative flex-1 overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-800"
                          >
                            <Pressable onPress={() => setViewerDocument(saved)}>
                              <Image source={{ uri: saved.uri }} resizeMode="cover" className="h-28 w-full" />
                              <View className="items-center justify-center bg-emerald-500/10 py-1.5">
                                <Text className="text-xs font-semibold text-emerald-400">✓ {slot.label}</Text>
                              </View>
                            </Pressable>
                            <Pressable
                              onPress={() => handleAddSlot(config, slot)}
                              hitSlop={8}
                              className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/30 active:bg-black/50"
                            >
                              <Text className="text-xs text-white">✎</Text>
                            </Pressable>
                          </View>
                        );
                      }

                      return (
                        <Pressable
                          key={slot.key}
                          onPress={() => handleAddSlot(config, slot)}
                          className="h-28 flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/40"
                        >
                          {isBusy ? (
                            <ActivityIndicator color="#818cf8" />
                          ) : (
                            <>
                              <Text className="mb-1 text-2xl text-slate-500">+</Text>
                              <Text className="text-xs font-medium text-slate-500">{slot.label}</Text>
                            </>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            }

            if (config.mode === 'list') {
              const items = findByCategory(config.key);

              return (
                <View
                  key={config.key}
                  className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg shadow-black/40"
                >
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-3">
                      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">
                        <Text className="text-2xl">{config.icon}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-white">{config.label}</Text>
                        <Text className="text-slate-400">
                          {items.length > 0 ? `${items.length} guardado(s)` : 'Ninguno guardado'}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => openCvPrompt(config)}
                      className="rounded-full bg-blue-600 px-4 py-2 shadow-md shadow-blue-900/40 active:bg-blue-700"
                    >
                      <Text className="font-semibold text-white">+ Añadir</Text>
                    </Pressable>
                  </View>

                  {items.length === 0 ? (
                    <Text className="italic text-slate-500">Aún no has añadido ningún CV.</Text>
                  ) : (
                    <View className="gap-2">
                      {items.map((item) => (
                        <View key={item.id} className="flex-row items-center gap-3 rounded-2xl bg-slate-800/60 p-3">
                          <Pressable
                            onPress={() => setViewerDocument(item)}
                            className="flex-1 flex-row items-center gap-3"
                          >
                            <Text className="text-xl">📄</Text>
                            <View className="flex-1">
                              <Text className="font-semibold text-white" numberOfLines={1}>
                                {item.label}
                              </Text>
                              <Text className="text-xs text-slate-500">
                                {new Date(item.savedAt).toLocaleDateString('es-ES')}
                              </Text>
                            </View>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteListItem(item.id)}
                            hitSlop={8}
                            className="h-8 w-8 items-center justify-center rounded-full active:bg-slate-700"
                          >
                            <Text className="text-slate-500">✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            }

            const saved = findDocument(config.key);
            const isBusy = busyId === config.key;

            return (
              <View
                key={config.key}
                className="relative mb-5 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg shadow-black/40"
              >
                <Pressable
                  onPress={() => saved && setViewerDocument(saved)}
                  disabled={!saved}
                  className="flex-row items-center gap-3"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">
                    <Text className="text-2xl">{config.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-white">{config.label}</Text>
                    <Text className="text-slate-400">{saved ? 'Toca para ver el documento' : 'Aún no guardado'}</Text>
                  </View>
                  {!saved && (
                    <View className="rounded-full bg-slate-800 px-3 py-1">
                      <Text className="text-xs font-semibold text-slate-500">Pendiente</Text>
                    </View>
                  )}
                </Pressable>

                {saved ? (
                  <Pressable
                    onPress={() => handleAddSingle(config)}
                    hitSlop={8}
                    className="absolute right-4 top-4 h-8 w-8 items-center justify-center rounded-full active:bg-slate-800"
                  >
                    <Text className="text-base text-slate-400">✎</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleAddSingle(config)}
                    disabled={isBusy}
                    className="mt-4 rounded-full bg-blue-600 px-4 py-3 shadow-md shadow-blue-900/40 active:bg-blue-700 disabled:opacity-50"
                  >
                    <Text className="text-center font-semibold text-white">
                      {isBusy ? 'Guardando…' : `Añadir ${config.label}`}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <DocumentViewer doc={viewerDocument} onClose={() => setViewerDocument(null)} />

      <PromptModal
        visible={cvPromptVisible}
        title="Nombre del CV"
        placeholder={pendingListConfig?.itemPlaceholder}
        confirmLabel="Seleccionar PDF"
        onCancel={closeCvPrompt}
        onConfirm={handleCvLabelConfirm}
      />
    </>
  );
}

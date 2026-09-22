import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getStoredDocuments, saveDocument, StoredDocument } from '../utils/fileManager';
import { DocumentViewer } from './DocumentViewer';

interface DocumentTypeConfig {
  key: string;
  label: string;
  icon: string;
  pickerType: 'document' | 'image';
}

const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  { key: 'dni', label: 'DNI', icon: '🪪', pickerType: 'image' },
  { key: 'padron', label: 'Padrón', icon: '🏠', pickerType: 'document' },
  { key: 'cv', label: 'CV', icon: '📄', pickerType: 'document' },
  { key: 'sanitaria', label: 'Tarjeta Sanitaria', icon: '🩺', pickerType: 'image' },
];

export function DashboardScreen() {
  const [documents, setDocuments] = useState<Record<string, StoredDocument>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [viewerDocument, setViewerDocument] = useState<StoredDocument | null>(null);

  const loadDocuments = useCallback(async () => {
    const stored = await getStoredDocuments();
    const byKey: Record<string, StoredDocument> = {};
    stored.forEach((doc) => {
      byKey[doc.key] = doc;
    });
    setDocuments(byKey);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleAdd = useCallback(
    async (config: DocumentTypeConfig) => {
      setBusyKey(config.key);
      try {
        if (config.pickerType === 'document') {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
          });
          if (result.canceled || !result.assets?.[0]) return;

          const asset = result.assets[0];
          await saveDocument(config.key, config.label, asset.uri, asset.name);
        } else {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos para continuar.');
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (result.canceled || !result.assets?.[0]) return;

          const asset = result.assets[0];
          const fileName = asset.fileName ?? `${config.key}.jpg`;
          await saveDocument(config.key, config.label, asset.uri, fileName);
        }

        await loadDocuments();
      } catch (err) {
        Alert.alert('Error', 'No se pudo guardar el documento. Inténtalo de nuevo.');
      } finally {
        setBusyKey(null);
      }
    },
    [loadDocuments],
  );

  return (
    <>
      <ScrollView className="flex-1 bg-slate-950" contentContainerClassName="px-5 pb-10 pt-16">
        <Text className="mb-1 text-2xl font-bold text-white">Mis documentos</Text>
        <Text className="mb-6 text-slate-400">
          Todo se guarda cifrado y offline en este dispositivo.
        </Text>

        <View className="gap-3">
          {DOCUMENT_TYPES.map((config) => {
            const saved = documents[config.key];
            const isBusy = busyKey === config.key;

            return (
              <View key={config.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <Pressable
                  onPress={() => saved && setViewerDocument(saved)}
                  disabled={!saved}
                  className="mb-3 flex-row items-center gap-3"
                >
                  <Text className="text-3xl">{config.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-white">{config.label}</Text>
                    <Text className={saved ? 'text-emerald-400' : 'text-slate-500'}>
                      {saved ? `${config.label} guardado · toca para ver` : 'Sin guardar'}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => handleAdd(config)}
                  disabled={isBusy}
                  className="rounded-full bg-blue-600 px-4 py-2 active:bg-blue-700 disabled:opacity-50"
                >
                  <Text className="text-center font-semibold text-white">
                    {isBusy ? 'Guardando…' : saved ? `Actualizar ${config.label}` : `Añadir ${config.label}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <DocumentViewer doc={viewerDocument} onClose={() => setViewerDocument(null)} />
    </>
  );
}

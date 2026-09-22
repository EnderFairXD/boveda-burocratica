import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import type { StoredDocument } from '../utils/fileManager';

interface DocumentViewerProps {
  doc: StoredDocument | null;
  onClose: () => void;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif'];

function isImageFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(extension);
}

export function DocumentViewer({ doc, onClose }: DocumentViewerProps) {
  return (
    <Modal
      visible={doc !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-950">
        <View className="flex-row items-center justify-between border-b border-slate-800 px-4 py-4 pt-14">
          <Text className="flex-1 pr-4 text-lg font-semibold text-white" numberOfLines={1}>
            {doc?.label ?? ''}
          </Text>
          <Pressable
            onPress={onClose}
            className="rounded-full bg-slate-800 px-4 py-2 active:bg-slate-700"
          >
            <Text className="font-semibold text-white">Cerrar</Text>
          </Pressable>
        </View>

        {doc &&
          (isImageFile(doc.fileName) ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
            >
              <Image
                source={{ uri: doc.uri }}
                resizeMode="contain"
                style={{ flex: 1, width: '100%' }}
              />
            </ScrollView>
          ) : (
            <Pdf
              source={{ uri: doc.uri, cache: true }}
              style={{ flex: 1, backgroundColor: '#020617' }}
              onError={(error) => console.warn('No se pudo abrir el PDF', error)}
            />
          ))}
      </View>
    </Modal>
  );
}

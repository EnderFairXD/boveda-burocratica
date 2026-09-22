import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

export type DocumentKey = string;

export interface StoredDocument {
  key: DocumentKey;
  label: string;
  uri: string;
  fileName: string;
  savedAt: string;
}

type DocumentIndex = Record<DocumentKey, StoredDocument>;

const INDEX_KEY = 'boveda_documentos_index';

function getDocumentsDirectory(): Directory {
  const documentsDirectory = new Directory(Paths.document, 'boveda-documentos');
  if (!documentsDirectory.exists) {
    documentsDirectory.create({ intermediates: true, idempotent: true });
  }
  return documentsDirectory;
}

async function readIndex(): Promise<DocumentIndex> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  return raw ? (JSON.parse(raw) as DocumentIndex) : {};
}

async function writeIndex(index: DocumentIndex): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index));
}

/**
 * Copia el archivo seleccionado al directorio privado de la app (offline) y
 * guarda su ruta en SecureStore, que en Android usa Keystore y en iOS el Keychain.
 */
export async function saveDocument(
  key: DocumentKey,
  label: string,
  sourceUri: string,
  originalFileName: string,
): Promise<StoredDocument> {
  const documentsDirectory = getDocumentsDirectory();

  const extension = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'dat';
  const fileName = `${key}-${Date.now()}.${extension}`;

  const sourceFile = new File(sourceUri);
  const destinationFile = new File(documentsDirectory, fileName);
  await sourceFile.copy(destinationFile, { overwrite: true });

  const document: StoredDocument = {
    key,
    label,
    uri: destinationFile.uri,
    fileName,
    savedAt: new Date().toISOString(),
  };

  const index = await readIndex();
  const previous = index[key];
  index[key] = document;
  await writeIndex(index);

  if (previous && previous.uri !== destinationFile.uri) {
    const previousFile = new File(previous.uri);
    if (previousFile.exists) {
      previousFile.delete();
    }
  }

  return document;
}

export async function getStoredDocuments(): Promise<StoredDocument[]> {
  const index = await readIndex();
  return Object.values(index);
}

export async function getDocument(key: DocumentKey): Promise<StoredDocument | null> {
  const index = await readIndex();
  return index[key] ?? null;
}

export async function deleteDocument(key: DocumentKey): Promise<void> {
  const index = await readIndex();
  const document = index[key];
  if (!document) return;

  const file = new File(document.uri);
  if (file.exists) {
    file.delete();
  }

  delete index[key];
  await writeIndex(index);
}

import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

export type DocumentCategory = string;

export interface StoredDocument {
  /** Identificador único. Para categorías de slot fijo (ej. DNI) es `${category}-${slot}`;
   * para listas (ej. CV) es un id generado por `generateDocumentId`. */
  id: string;
  category: DocumentCategory;
  /** Sub-posición dentro de la categoría, ej. 'anverso' | 'reverso' para el DNI. */
  slot?: string;
  label: string;
  uri: string;
  fileName: string;
  savedAt: string;
}

interface SaveDocumentParams {
  id: string;
  category: DocumentCategory;
  slot?: string;
  label: string;
  sourceUri: string;
  originalFileName: string;
}

type DocumentIndex = Record<string, StoredDocument>;

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

/** Genera un id único para documentos de tipo lista (ej. varios CVs). */
export function generateDocumentId(category: DocumentCategory): string {
  return `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Copia el archivo seleccionado al directorio privado de la app (offline) y
 * guarda su ruta en SecureStore, que en Android usa Keystore y en iOS el Keychain.
 * Si `id` ya existía, sustituye ese documento y borra el archivo anterior.
 */
export async function saveDocument(params: SaveDocumentParams): Promise<StoredDocument> {
  const { id, category, slot, label, sourceUri, originalFileName } = params;
  const documentsDirectory = getDocumentsDirectory();

  const extension = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'dat';
  const fileName = `${id}.${extension}`;

  const sourceFile = new File(sourceUri);
  const destinationFile = new File(documentsDirectory, fileName);
  await sourceFile.copy(destinationFile, { overwrite: true });

  const document: StoredDocument = {
    id,
    category,
    slot,
    label,
    uri: destinationFile.uri,
    fileName,
    savedAt: new Date().toISOString(),
  };

  const index = await readIndex();
  const previous = index[id];
  index[id] = document;
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

export async function getDocumentsByCategory(category: DocumentCategory): Promise<StoredDocument[]> {
  const all = await getStoredDocuments();
  return all.filter((doc) => doc.category === category);
}

export async function deleteDocument(id: string): Promise<void> {
  const index = await readIndex();
  const document = index[id];
  if (!document) return;

  const file = new File(document.uri);
  if (file.exists) {
    file.delete();
  }

  delete index[id];
  await writeIndex(index);
}

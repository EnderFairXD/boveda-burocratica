import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
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
  /** Ruta del archivo en disco, cifrado con AES-256-GCM. */
  uri: string;
  /** Nombre lógico con la extensión original; de ella sale el tipo (imagen o PDF). */
  fileName: string;
  savedAt: string;
  /** Las versiones anteriores guardaban el archivo en claro y no tenían este campo. */
  encrypted?: true;
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
const ENCRYPTION_KEY_STORAGE_KEY = 'boveda_documentos_aes_key';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

let cachedKeyPromise: Promise<AESEncryptionKey> | null = null;

/** Clave AES-256 guardada en Keystore (Android) / Keychain (iOS) vía SecureStore.
 * Se genera una vez por instalación y nunca se escribe en disco. */
function getEncryptionKey(): Promise<AESEncryptionKey> {
  if (!cachedKeyPromise) {
    cachedKeyPromise = (async () => {
      const existing = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
      if (existing) {
        return AESEncryptionKey.import(existing, 'hex');
      }
      const key = await AESEncryptionKey.generate();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, await key.encoded('hex'));
      return key;
    })();
    cachedKeyPromise.catch(() => {
      cachedKeyPromise = null;
    });
  }
  return cachedKeyPromise;
}

async function writeEncrypted(destination: File, plaintext: Uint8Array): Promise<void> {
  const sealed = await aesEncryptAsync(plaintext, await getEncryptionKey());
  destination.create({ overwrite: true });
  destination.write(await sealed.combined());
}

function mimeTypeOf(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[extension] ?? 'application/octet-stream';
}

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
 * Cifra el archivo seleccionado y lo guarda en el directorio privado de la app
 * (offline). El índice va en SecureStore, que en Android usa Keystore y en iOS el
 * Keychain. Si `id` ya existía, sustituye ese documento y borra el archivo anterior.
 */
export async function saveDocument(params: SaveDocumentParams): Promise<StoredDocument> {
  const { id, category, slot, label, sourceUri, originalFileName } = params;
  const documentsDirectory = getDocumentsDirectory();

  const extension = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'dat';
  const fileName = `${id}.${extension}`;

  const plaintext = await new File(sourceUri).bytes();
  const destinationFile = new File(documentsDirectory, `${id}.enc`);
  await writeEncrypted(destinationFile, plaintext);

  const document: StoredDocument = {
    id,
    category,
    slot,
    label,
    uri: destinationFile.uri,
    fileName,
    savedAt: new Date().toISOString(),
    encrypted: true,
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

/**
 * Cifra los documentos que versiones anteriores guardaron en claro. Primero
 * escribe la copia cifrada, luego actualiza el índice y solo entonces borra el
 * original, así que si la app se cierra a mitad no se pierde nada.
 */
async function migrateLegacyDocuments(index: DocumentIndex): Promise<DocumentIndex> {
  const legacy = Object.values(index).filter((doc) => !doc.encrypted);
  if (legacy.length === 0) return index;

  const documentsDirectory = getDocumentsDirectory();
  const migrated: DocumentIndex = { ...index };
  const originals: File[] = [];

  for (const doc of legacy) {
    const original = new File(doc.uri);
    if (!original.exists) continue;

    const encryptedFile = new File(documentsDirectory, `${doc.id}.enc`);
    await writeEncrypted(encryptedFile, await original.bytes());
    migrated[doc.id] = { ...doc, uri: encryptedFile.uri, encrypted: true };
    originals.push(original);
  }

  if (originals.length === 0) return index;
  await writeIndex(migrated);
  for (const original of originals) {
    original.delete();
  }
  return migrated;
}

let migrationQueue: Promise<unknown> = Promise.resolve();

/** Lee el índice migrando antes lo que quede en claro. Las lecturas se encolan, así
 * que dos pantallas pidiendo la lista a la vez nunca migran el mismo archivo dos veces. */
function readMigratedIndex(): Promise<DocumentIndex> {
  const run = migrationQueue.then(() => readIndex().then(migrateLegacyDocuments));
  migrationQueue = run.catch(() => undefined);
  return run;
}

export async function getStoredDocuments(): Promise<StoredDocument[]> {
  return Object.values(await readMigratedIndex());
}

/** Descifra un documento y lo devuelve como data URI, listo para <Image> o el visor de PDF.
 * El contenido en claro solo existe en memoria. */
export async function readDocumentDataUri(document: StoredDocument): Promise<string> {
  const stored = await new File(document.uri).bytes();
  const base64 = document.encrypted
    ? await aesDecryptAsync(AESSealedData.fromCombined(stored), await getEncryptionKey(), { output: 'base64' })
    : uint8ToBase64(stored);
  return `data:${mimeTypeOf(document.fileName)};base64,${base64}`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
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

/// <reference types="jest" />
/// <reference types="node" />

/* Las fábricas de jest.mock y jest.isolateModules necesitan require(). */
/* eslint-disable @typescript-eslint/no-require-imports */
import { disk, File } from './testing/fakeFileSystem';
import { items } from './testing/fakeSecureStore';

jest.mock('expo-file-system', () => require('./testing/fakeFileSystem'));
jest.mock('expo-secure-store', () => require('./testing/fakeSecureStore'));
jest.mock('expo-crypto', () => require('./testing/fakeCrypto'));

type FileManager = typeof import('./fileManager');

const INDEX_KEY = 'boveda_documentos_index';
const DNI_BYTES = new TextEncoder().encode('DNI 12345678Z  Nombre: Javier  Caduca: 2031');
const PDF_BYTES = new TextEncoder().encode('%PDF-1.7 informe de vacunas');

/** Carga fileManager de cero, como al abrir la app otra vez: lo único que
 * sobrevive entre "arranques" es lo que haya en disco y en SecureStore. */
function loadFileManager(): FileManager {
  let module!: FileManager;
  jest.isolateModules(() => {
    module = require('./fileManager');
  });
  return module;
}

function putSourceFile(uri: string, bytes: Uint8Array): string {
  disk.set(uri, new Uint8Array(bytes));
  return uri;
}

function contains(haystack: Uint8Array, needle: Uint8Array): boolean {
  return Buffer.from(haystack).includes(Buffer.from(needle));
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

beforeEach(() => {
  disk.clear();
  items.clear();
});

describe('guardar documentos', () => {
  test('el archivo que queda en disco no contiene el documento en claro', async () => {
    const { saveDocument } = loadFileManager();
    const sourceUri = putSourceFile('file:///cache/picker/dni.jpg', DNI_BYTES);

    const doc = await saveDocument({
      id: 'dni-anverso', category: 'dni', slot: 'anverso', label: 'DNI (anverso)',
      sourceUri, originalFileName: 'dni.jpg',
    });

    const stored = disk.get(doc.uri);
    expect(stored).toBeDefined();
    expect(contains(stored!, DNI_BYTES)).toBe(false);
  });

  test('se puede leer de vuelta el contenido original con su tipo', async () => {
    const { saveDocument, readDocumentDataUri } = loadFileManager();
    const sourceUri = putSourceFile('file:///cache/picker/dni.jpg', DNI_BYTES);
    const doc = await saveDocument({
      id: 'dni-anverso', category: 'dni', label: 'DNI', sourceUri, originalFileName: 'dni.jpg',
    });

    expect(await readDocumentDataUri(doc)).toBe(`data:image/jpeg;base64,${base64(DNI_BYTES)}`);
  });

  test('los PDF se leen como application/pdf', async () => {
    const { saveDocument, readDocumentDataUri } = loadFileManager();
    const sourceUri = putSourceFile('file:///cache/picker/vacunas.pdf', PDF_BYTES);
    const doc = await saveDocument({
      id: 'vacunas-1', category: 'vacunas', label: 'Vacunas', sourceUri, originalFileName: 'vacunas.pdf',
    });

    expect(await readDocumentDataUri(doc)).toBe(`data:application/pdf;base64,${base64(PDF_BYTES)}`);
  });

  test('tras reabrir la app los documentos siguen pudiéndose leer', async () => {
    const first = loadFileManager();
    const sourceUri = putSourceFile('file:///cache/picker/dni.jpg', DNI_BYTES);
    await first.saveDocument({
      id: 'dni-anverso', category: 'dni', label: 'DNI', sourceUri, originalFileName: 'dni.jpg',
    });

    const second = loadFileManager();
    const [doc] = await second.getStoredDocuments();
    expect(await second.readDocumentDataUri(doc)).toBe(`data:image/jpeg;base64,${base64(DNI_BYTES)}`);
  });

  test('sustituir un documento deja solo el contenido nuevo', async () => {
    const { saveDocument, readDocumentDataUri, getStoredDocuments } = loadFileManager();
    const first = putSourceFile('file:///cache/picker/viejo.jpg', DNI_BYTES);
    await saveDocument({ id: 'dni-anverso', category: 'dni', label: 'DNI', sourceUri: first, originalFileName: 'viejo.jpg' });
    const second = putSourceFile('file:///cache/picker/nuevo.pdf', PDF_BYTES);
    await saveDocument({ id: 'dni-anverso', category: 'dni', label: 'DNI', sourceUri: second, originalFileName: 'nuevo.pdf' });

    const docs = await getStoredDocuments();
    expect(docs).toHaveLength(1);
    expect(await readDocumentDataUri(docs[0])).toBe(`data:application/pdf;base64,${base64(PDF_BYTES)}`);
    const vaultFiles = [...disk.keys()].filter((uri) => uri.includes('boveda-documentos'));
    expect(vaultFiles).toEqual([docs[0].uri]);
  });

  test('borrar un documento elimina su archivo cifrado', async () => {
    const { saveDocument, deleteDocument, getStoredDocuments } = loadFileManager();
    const sourceUri = putSourceFile('file:///cache/picker/dni.jpg', DNI_BYTES);
    const doc = await saveDocument({ id: 'dni-anverso', category: 'dni', label: 'DNI', sourceUri, originalFileName: 'dni.jpg' });

    await deleteDocument(doc.id);

    expect(disk.has(doc.uri)).toBe(false);
    expect(await getStoredDocuments()).toEqual([]);
  });
});

describe('migración de documentos guardados en claro por versiones anteriores', () => {
  const legacyUri = 'file:///documentos/boveda-documentos/dni-anverso.jpg';

  function seedLegacyDocument() {
    disk.set(legacyUri, new Uint8Array(DNI_BYTES));
    items.set(INDEX_KEY, JSON.stringify({
      'dni-anverso': {
        id: 'dni-anverso', category: 'dni', slot: 'anverso', label: 'DNI (anverso)',
        uri: legacyUri, fileName: 'dni-anverso.jpg', savedAt: '2026-09-23T10:00:00.000Z',
      },
    }));
  }

  test('al cargar la lista, el archivo en claro se cifra y se borra', async () => {
    seedLegacyDocument();
    const { getStoredDocuments } = loadFileManager();

    const [doc] = await getStoredDocuments();

    expect(disk.has(legacyUri)).toBe(false);
    expect(contains(disk.get(doc.uri)!, DNI_BYTES)).toBe(false);
  });

  test('el documento migrado conserva su contenido y sus datos', async () => {
    seedLegacyDocument();
    const { getStoredDocuments, readDocumentDataUri } = loadFileManager();

    const [doc] = await getStoredDocuments();

    expect(doc).toMatchObject({ id: 'dni-anverso', slot: 'anverso', label: 'DNI (anverso)', savedAt: '2026-09-23T10:00:00.000Z' });
    expect(await readDocumentDataUri(doc)).toBe(`data:image/jpeg;base64,${base64(DNI_BYTES)}`);
  });

  test('migrar dos veces no vuelve a cifrar lo ya cifrado', async () => {
    seedLegacyDocument();
    await loadFileManager().getStoredDocuments();

    const again = loadFileManager();
    const [doc] = await again.getStoredDocuments();

    expect(await again.readDocumentDataUri(doc)).toBe(`data:image/jpeg;base64,${base64(DNI_BYTES)}`);
  });

  test('dos cargas simultáneas de la lista no fallan ni pierden el documento', async () => {
    seedLegacyDocument();
    const { getStoredDocuments, readDocumentDataUri } = loadFileManager();

    const [first, second] = await Promise.all([getStoredDocuments(), getStoredDocuments()]);

    expect(first.map((doc) => doc.id)).toEqual(['dni-anverso']);
    expect(second.map((doc) => doc.id)).toEqual(['dni-anverso']);
    expect(await readDocumentDataUri(second[0])).toBe(`data:image/jpeg;base64,${base64(DNI_BYTES)}`);
  });

  test('si el archivo antiguo ya no existe, la lista se carga igualmente', async () => {
    seedLegacyDocument();
    new File(legacyUri).delete();

    const docs = await loadFileManager().getStoredDocuments();

    expect(docs.map((doc) => doc.id)).toEqual(['dni-anverso']);
  });
});

import { useEffect, useState } from 'react';
import { readDocumentDataUri, type StoredDocument } from '../utils/fileManager';

/** Descifra el documento en memoria y devuelve su data URI (null mientras carga o
 * si no se pudo leer). Un resultado solo vale para el documento del que salió. */
export function useDocumentDataUri(document: StoredDocument | null): string | null {
  const [result, setResult] = useState<{ key: string; dataUri: string } | null>(null);
  const key = document ? `${document.uri}|${document.savedAt}` : null;

  useEffect(() => {
    if (!document || !key) return;

    let ignore = false;
    readDocumentDataUri(document)
      .then((dataUri) => {
        if (!ignore) setResult({ key, dataUri });
      })
      .catch((error) => console.warn('No se pudo descifrar el documento', error));

    return () => {
      ignore = true;
    };
    // El documento se identifica por su archivo y su fecha de guardado (`key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result && result.key === key ? result.dataUri : null;
}

import * as Application from 'expo-application';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type UpdateStatus = 'idle' | 'available' | 'downloading' | 'error';

interface UseGithubUpdateResult {
  status: UpdateStatus;
  latestVersion: string | null;
  applyUpdate: () => void;
}

const REPO = 'EnderFairXD/boveda-burocratica';
const RELEASES_API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const FLAG_GRANT_READ_URI_PERMISSION = 1;

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
}

/** Compara tags tipo "v1.9.2" por segmentos numéricos, no alfabéticamente
 * (si no, "1.9" saldría "mayor" que "1.10"). */
function parseVersionSegments(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split('.')
    .map((segment) => parseInt(segment, 10) || 0);
}

function isNewer(remote: string, local: string): boolean {
  const remoteSegments = parseVersionSegments(remote);
  const localSegments = parseVersionSegments(local);
  const length = Math.max(remoteSegments.length, localSegments.length);

  for (let i = 0; i < length; i++) {
    const remoteValue = remoteSegments[i] ?? 0;
    const localValue = localSegments[i] ?? 0;
    if (remoteValue !== localValue) return remoteValue > localValue;
  }
  return false;
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const response = await fetch(RELEASES_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return null;

  const json = await response.json();
  const asset = (json.assets ?? []).find((item: { name?: string }) => item.name?.endsWith('.apk'));
  if (!asset || typeof json.tag_name !== 'string') return null;

  return { version: json.tag_name, downloadUrl: asset.browser_download_url as string };
}

/**
 * Autoactualización vía GitHub Releases: descarga el APK publicado y pide a
 * Android que lo instale encima del actual. Sustituye a EAS Update — esto
 * reemplaza el binario entero (icono, permisos, código nativo incluidos),
 * no solo el bundle JS, pero solo funciona en Android (iOS no permite
 * instalar apps fuera de la App Store) y requiere que el usuario confirme
 * el diálogo de instalación del sistema.
 */
export function useGithubUpdate(): UseGithubUpdateResult {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android' || __DEV__) return;

    let ignore = false;

    fetchLatestRelease()
      .then((release) => {
        if (ignore || !release) return;
        const currentVersion = Application.nativeApplicationVersion ?? '0';
        if (isNewer(release.version, currentVersion)) {
          setLatestVersion(release.version);
          setStatus('available');
        }
      })
      .catch(() => {
        // Sin conexión o límite de la API de GitHub (60 peticiones/hora sin token): fallamos en silencio.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    setStatus('downloading');

    (async () => {
      const release = await fetchLatestRelease();
      if (!release) throw new Error('No se encontró ninguna versión publicada en GitHub.');

      const destination = new File(Paths.cache, 'update.apk');
      if (destination.exists) destination.delete();

      const response = await fetch(release.downloadUrl);
      if (!response.ok) throw new Error('No se pudo descargar el APK de la actualización.');

      destination.create();
      destination.write(new Uint8Array(await response.arrayBuffer()));

      const applicationId = Application.applicationId;
      const contentUri = `content://${applicationId}.fileprovider/apk/update.apk`;

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: FLAG_GRANT_READ_URI_PERMISSION,
      });

      setStatus('idle');
    })().catch(() => {
      setStatus('error');
    });
  }, []);

  return { status, latestVersion, applyUpdate };
}

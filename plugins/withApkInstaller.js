const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILE_PROVIDER_AUTHORITY_SUFFIX = '.fileprovider';

/**
 * Permite que la app pida instalar un APK descargado (autoactualización desde
 * GitHub Releases): permiso REQUEST_INSTALL_PACKAGES + FileProvider apuntando
 * a la caché, para poder exponer el APK descargado como content:// URI al
 * instalador del sistema (obligatorio desde Android 7, no se puede pasar
 * file:// entre apps).
 */
function withApkInstaller(config) {
  const androidPackage = config.android && config.android.package;
  if (!androidPackage) {
    throw new Error('withApkInstaller requiere que app.json defina android.package');
  }

  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    androidManifest['uses-permission'] = androidManifest['uses-permission'] || [];
    const hasInstallPermission = androidManifest['uses-permission'].some(
      (item) => item.$['android:name'] === 'android.permission.REQUEST_INSTALL_PACKAGES',
    );
    if (!hasInstallPermission) {
      androidManifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.REQUEST_INSTALL_PACKAGES' },
      });
    }

    const application = androidManifest.application[0];
    application.provider = application.provider || [];
    const hasProvider = application.provider.some(
      (item) => item.$['android:name'] === 'androidx.core.content.FileProvider',
    );
    if (!hasProvider) {
      application.provider.push({
        $: {
          'android:name': 'androidx.core.content.FileProvider',
          'android:authorities': `${androidPackage}${FILE_PROVIDER_AUTHORITY_SUFFIX}`,
          'android:exported': 'false',
          'android:grantUriPermissions': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.support.FILE_PROVIDER_PATHS',
              'android:resource': '@xml/file_paths',
            },
          },
        ],
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    'android',
    (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml/file_paths.xml',
      );
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        '<?xml version="1.0" encoding="utf-8"?>\n<paths>\n  <cache-path name="apk" path="." />\n</paths>\n',
      );
      return config;
    },
  ]);

  return config;
}

module.exports = withApkInstaller;

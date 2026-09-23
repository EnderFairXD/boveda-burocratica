const { withAppBuildGradle } = require('expo/config-plugins');

// Firma release con nuestra keystore si las variables de entorno están
// presentes (CI); si no (desarrollo local normal), cae a la debug.keystore
// que ya genera React Native, para no romper `npx expo run:android`.
const SIGNING_CONFIG_BLOCK = `
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('signingConfigs.release')) {
      return config;
    }

    const signingConfigsMarker = /signingConfigs\s*\{/;
    if (!signingConfigsMarker.test(contents)) {
      throw new Error('withAndroidReleaseSigning: no se encontró el bloque signingConfigs en build.gradle');
    }
    contents = contents.replace(signingConfigsMarker, (match) => `${match}\n${SIGNING_CONFIG_BLOCK}`);

    const releaseSigningLine = /(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/;
    if (!releaseSigningLine.test(contents)) {
      throw new Error('withAndroidReleaseSigning: no se encontró "signingConfig signingConfigs.debug" en el buildType release');
    }
    contents = contents.replace(releaseSigningLine, '$1signingConfig signingConfigs.release');

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;

import type { ConfigContext, ExpoConfig } from 'expo/config';

import factory from './factory.config.js';

/**
 * Expo yapılandırması `factory.config.js` dosyasından üretilir.
 * Bu dosyayı uygulama başına düzenlemeniz gerekmez.
 */

// Google'ın herkese açık örnek AdMob uygulama kimlikleri. Yalnızca gerçek kimlik
// henüz girilmemişken native SDK'nın açılışta çökmesini önlemek için kullanılır;
// bu durumda yayın sürümünde hiçbir reklam birimi yüklenmez ve
// `npm run verify:release` production build'i durdurur.
const ADMOB_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const PROGUARD_RULES = [
  '-keep class * extends androidx.room.RoomDatabase { *; }',
  '-keep @androidx.room.Database class * { *; }',
  '-dontwarn androidx.work.**',
  '-keep class androidx.work.** { *; }',
  '-keep class com.google.android.gms.ads.** { *; }',
  '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
].join('\n');

export default ({ config }: ConfigContext): ExpoConfig => {
  const { app, brand, monetization, eas } = factory;

  return {
    ...config,
    name: app.name,
    slug: app.slug,
    scheme: app.scheme,
    version: app.version,
    ...(eas.owner ? { owner: eas.owner } : {}),
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: app.iosBundleIdentifier,
      supportsTablet: false,
    },
    android: {
      package: app.androidPackage,
      permissions: ['com.android.vending.BILLING', 'android.permission.INTERNET'],
      adaptiveIcon: {
        backgroundColor: brand.adaptiveIconBackground,
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: brand.splashBackground,
          image: './assets/images/splash-icon.png',
          imageWidth: 140,
        },
      ],
      'expo-sqlite',
      'expo-sharing',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: monetization.admob.androidAppId || ADMOB_SAMPLE_ANDROID_APP_ID,
          iosAppId: monetization.admob.iosAppId || ADMOB_SAMPLE_IOS_APP_ID,
          delayAppMeasurementInit: true,
          userTrackingUsageDescription:
            'This identifier will be used to deliver more relevant ads to you.',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: false,
            enableShrinkResourcesInReleaseBuilds: false,
            extraProguardRules: PROGUARD_RULES,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      ...config.extra,
      factory,
      ...(eas.projectId ? { eas: { projectId: eas.projectId } } : {}),
    },
  };
};

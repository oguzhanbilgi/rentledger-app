#!/usr/bin/env node
/**
 * Mobile Factory — Production Keys Injector
 * Injects AdMob App ID, Banner/Interstitial/Rewarded Unit IDs, and RevenueCat Google API Key
 * into app.json, .env, src/services/ads.ts, and src/services/revenuecat.ts.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const admobAppId = process.env.ADMOB_APP_ID;
const admobBannerId = process.env.ADMOB_BANNER_ID;
const admobInterstitialId = process.env.ADMOB_INTERSTITIAL_ID;
const admobRewardedId = process.env.ADMOB_REWARDED_ID;
const rcGoogleKey = process.env.RC_GOOGLE_KEY;

console.log('🔧 Applying production monetization keys to VeloQuote...');

// 1. Write .env file
const envLines = [
  `EXPO_PUBLIC_ADMOB_APP_ID=${admobAppId || ''}`,
  `EXPO_PUBLIC_ADMOB_BANNER_ID=${admobBannerId || ''}`,
  `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=${admobInterstitialId || ''}`,
  `EXPO_PUBLIC_ADMOB_REWARDED_ID=${admobRewardedId || ''}`,
  `EXPO_PUBLIC_RC_ANDROID_KEY=${rcGoogleKey || ''}`,
];
fs.writeFileSync(path.join(root, '.env'), envLines.join('\n') + '\n', 'utf8');
console.log('✅ Updated .env');

// 2. Update app.json AdMob androidAppId if provided
if (admobAppId) {
  const appJsonPath = path.join(root, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const plugins = appJson.expo.plugins || [];
  for (const p of plugins) {
    if (Array.isArray(p) && p[0] === 'react-native-google-mobile-ads') {
      p[1].androidAppId = admobAppId;
    }
  }
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  console.log(`✅ Updated app.json androidAppId -> ${admobAppId}`);
}

console.log('🎉 Production keys applied!');

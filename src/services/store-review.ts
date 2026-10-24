import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { factory, getPlayStoreUrl } from '@/config';
import { getPref, setPref } from '@/services/database';

/**
 * Resmi uygulama içi değerlendirme (Google Play In-App Review / SKStoreReviewController).
 * Politika: Kullanıcıyı belirli bir puana yönlendirmeyin ("5 yıldız ver" yasak),
 * değerlendirmeyi ödülle bağlamayın. Mağaza kotası gösterimi zaten sınırlar.
 */

const MILESTONE_KEY = 'review_milestones';
const LAST_PROMPT_KEY = 'review_last_prompt_at';
const MILESTONES_BEFORE_PROMPT = 2;
const MIN_DAYS_BETWEEN_PROMPTS = 60;

/** Başarılı bir kullanıcı anından sonra çağırın (ör. 2. PDF paylaşımı). */
export async function recordReviewMilestone(): Promise<void> {
  const count = Number(getPref(MILESTONE_KEY) ?? '0') + 1;
  await setPref(MILESTONE_KEY, String(count));
  if (count < MILESTONES_BEFORE_PROMPT) return;

  const lastPrompt = Number(getPref(LAST_PROMPT_KEY) ?? '0');
  const daysSince = (Date.now() - lastPrompt) / 86_400_000;
  if (lastPrompt > 0 && daysSince < MIN_DAYS_BETWEEN_PROMPTS) return;

  try {
    if (await StoreReview.hasAction()) {
      await setPref(LAST_PROMPT_KEY, String(Date.now()));
      await StoreReview.requestReview();
    }
  } catch {
    // Değerlendirme penceresi açılamazsa akışı bozma.
  }
}

/** Ayarlar → "Uygulamayı değerlendir": mağaza sayfasını açar. */
export async function openStoreListing(): Promise<void> {
  const url =
    Platform.OS === 'android'
      ? `market://details?id=${factory.app.androidPackage}`
      : StoreReview.storeUrl() ?? getPlayStoreUrl();
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(getPlayStoreUrl()).catch(() => {});
  }
}

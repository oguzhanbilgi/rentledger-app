import { useSyncExternalStore } from 'react';

import { getPref, setPref } from '@/services/database';

/**
 * Onboarding durumu. Ayarlar'daki "Kurulum sihirbazını tekrar başlat"
 * `requestOnboardingReplay()` ile ana ekrandaki sihirbazı yeniden açar.
 */

const DONE_KEY = 'app_onboarding_done';
const ANSWERS_KEY = 'app_onboarding_answers';

type Listener = () => void;
const listeners = new Set<Listener>();
let replayToken = 0;

export function isOnboardingDone(): boolean {
  return getPref(DONE_KEY) === 'true';
}

export function getOnboardingAnswers(): Record<string, string> {
  try {
    return JSON.parse(getPref(ANSWERS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export async function completeOnboarding(answers: Record<string, string>): Promise<void> {
  await setPref(ANSWERS_KEY, JSON.stringify(answers));
  await setPref(DONE_KEY, 'true');
}

export function requestOnboardingReplay(): void {
  replayToken += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Her replay isteğinde artan sayaç; ana ekran bunu izleyip sihirbazı açar. */
export function useOnboardingReplayToken(): number {
  return useSyncExternalStore(subscribe, () => replayToken, () => replayToken);
}

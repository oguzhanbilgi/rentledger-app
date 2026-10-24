import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Bağlama göre dokunsal geri bildirim (DESIGN.md koreografisi).
 * Haptik hiçbir zaman akışı bozmamalı; hatalar sessizce yutulur.
 */
function run(effect: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  effect().catch(() => {});
}

export const triggerHaptic = {
  selection: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

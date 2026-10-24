import { Share } from 'react-native';

import { getPlayStoreUrl } from '@/config';
import { brandParams, t } from '@/services/i18n';

/**
 * Uygulamayı paylaşma. Not: Android, kullanıcı paylaşmadan kapatsa bile
 * çoğu zaman "shared" döndürür; bu yüzden paylaşım bonusu `credits.ts`
 * içinde günlük/toplam sınırla korunur.
 */
export async function shareApp(): Promise<'shared' | 'dismissed'> {
  try {
    const result = await Share.share({
      message: t('shareMessage', brandParams({ url: getPlayStoreUrl() })),
    });
    return result.action === Share.sharedAction ? 'shared' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}

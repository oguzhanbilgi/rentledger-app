import { Alert, Linking, Platform } from 'react-native';
import { getPreference, setPreference } from './database';

export async function requestStoreReviewIfAppropriate(
  packageName: string = 'com.mobilefactory.rentledger',
  appName: string = 'RentLedger Pro',
  lang: 'tr' | 'en' = 'en'
): Promise<void> {
  try {
    const hasRated = await getPreference('has_prompted_store_review');
    if (hasRated === 'true') return;

    const actionCountStr = await getPreference('satisfaction_action_count');
    const actionCount = (parseInt(actionCountStr || '0', 10) || 0) + 1;
    await setPreference('satisfaction_action_count', String(actionCount));

    // Prompt after 2 successful rent receipts/reminders
    if (actionCount !== 2) return;

    await setPreference('has_prompted_store_review', 'true');

    const isTr = lang === 'tr';
    const title = isTr ? `⭐ ${appName} Uygulamasını Beğendiniz mi?` : `⭐ Enjoying ${appName}?`;
    const message = isTr
      ? 'Kira takibi ve resmi makbuz oluşturmanıza yardımcı olduysak, Google Play\'de 5 yıldızlı bir değerlendirme bırakarak bize destek olur musunuz?'
      : 'If RentLedger Pro helped you manage rents & receipts with ease, a quick 5-star review on Google Play helps us keep adding free features!';

    Alert.alert(
      title,
      message,
      [
        {
          text: isTr ? 'Daha Sonra' : 'Not Now',
          style: 'cancel',
        },
        {
          text: isTr ? '⭐⭐⭐⭐⭐ 5 Yıldız Ver' : '⭐⭐⭐⭐⭐ Rate 5 Stars',
          onPress: async () => {
            const playUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
            const marketUrl = `market://details?id=${packageName}`;
            try {
              if (Platform.OS === 'android') {
                const canOpenMarket = await Linking.canOpenURL(marketUrl);
                if (canOpenMarket) {
                  await Linking.openURL(marketUrl);
                  return;
                }
              }
              await Linking.openURL(playUrl);
            } catch {
              await Linking.openURL(playUrl);
            }
          },
        },
      ],
      { cancelable: true }
    );
  } catch {
    // Fail silently
  }
}

import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExternalLink, X } from 'lucide-react-native';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { factory } from '@/config';
import { useThemeColors } from '@/constants/theme';
import { brandParams, useI18n } from '@/services/i18n';

export type LegalDocType = 'privacy' | 'terms';

/**
 * Uygulama içi yasal özet + tam metne bağlantı. Metinler `factory.config.js`
 * (uygulama adı, stüdyo, e-posta, URL'ler) ile doldurulur; başka uygulamanın
 * metni yanlışlıkla kopyalanamaz.
 */
export function LegalModal({
  visible,
  initialDoc = 'privacy',
  onClose,
}: {
  visible: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [doc, setDoc] = useState<LegalDocType>(initialDoc);

  useEffect(() => {
    if (visible) setDoc(initialDoc);
  }, [visible, initialDoc]);

  const url = doc === 'privacy' ? factory.studio.privacyPolicyUrl : factory.studio.termsUrl;
  const body = t(doc === 'privacy' ? 'legalPrivacyBody' : 'legalTermsBody', brandParams());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
          <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">
            {t(doc === 'privacy' ? 'legalPrivacyTitle' : 'legalTermsTitle')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-elevated active:opacity-70 dark:bg-elevated-dark">
            <X size={18} color={colors.muted} />
          </Pressable>
        </View>

        <View className="px-5">
          <SegmentedControl
            value={doc}
            onChange={setDoc}
            options={[
              { value: 'privacy', label: t('privacyPolicy') },
              { value: 'terms', label: t('termsOfUse') },
            ]}
          />
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20 }}>
          <Text className="text-[15px] leading-6 text-ink dark:text-ink-dark">{body}</Text>

          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(url).catch(() => {})}
            className="mt-6 flex-row items-center gap-2 self-start py-2 active:opacity-70">
            <ExternalLink size={16} color={colors.primary} />
            <Text className="text-[15px] font-semibold text-primary">{t('openFullPolicy')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

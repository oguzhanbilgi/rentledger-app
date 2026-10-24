import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useThemeColors } from '@/constants/theme';
import { useI18n } from '@/services/i18n';

/** Form sayfaları için tam ekran (iOS'ta sayfa) modal: başlık, kapat, klavye uyumlu kaydırma. */
export function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between gap-3 border-b border-line px-5 pb-3 pt-3 dark:border-line-dark">
          <View className="flex-1 flex-row items-center gap-3">
            {icon ? (
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent/15">{icon}</View>
            ) : null}
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-ink dark:text-ink-dark">{title}</Text>
              {subtitle ? <Text className="text-xs text-muted dark:text-muted-dark">{subtitle}</Text> : null}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-elevated active:opacity-70 dark:bg-elevated-dark">
            <X size={18} color={colors.muted} />
          </Pressable>
        </View>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

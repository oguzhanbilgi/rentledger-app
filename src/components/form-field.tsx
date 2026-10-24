import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useThemeColors } from '@/constants/theme';
import { triggerHaptic } from '@/services/haptics';
import { useI18n } from '@/services/i18n';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text className="mb-1.5 text-xs font-semibold text-muted dark:text-muted-dark">{children}</Text>;
}

/** Etiketli metin girişi (token renkleri, açık/koyu mod uyumlu). */
export function FormField({
  label,
  className = '',
  multiline,
  ...inputProps
}: TextInputProps & { label: string; className?: string }) {
  const colors = useThemeColors();
  return (
    <View className={className}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor={colors.faint}
        className={`rounded-2xl border border-line bg-elevated px-4 text-[15px] text-ink dark:border-line-dark dark:bg-elevated-dark dark:text-ink-dark ${
          multiline ? 'min-h-[72px] py-3' : 'min-h-[48px]'
        }`}
      />
    </View>
  );
}

/** Önceki / sonraki düğmeli seçim alanı (kira dönemi, ödeme tarihi). */
export function StepperField({
  label,
  value,
  onPrevious,
  onNext,
  className = '',
}: {
  label: string;
  value: string;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const step = (action: () => void) => () => {
    triggerHaptic.selection();
    action();
  };
  return (
    <View className={className}>
      <FieldLabel>{label}</FieldLabel>
      <View className="min-h-[48px] flex-row items-center rounded-2xl border border-line bg-elevated dark:border-line-dark dark:bg-elevated-dark">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('previousLabel')}
          onPress={step(onPrevious)}
          hitSlop={8}
          className="h-12 w-11 items-center justify-center active:opacity-60">
          <ChevronLeft size={18} color={colors.muted} />
        </Pressable>
        <Text className="flex-1 text-center text-[15px] font-semibold text-ink dark:text-ink-dark" numberOfLines={1}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nextLabel')}
          onPress={step(onNext)}
          hitSlop={8}
          className="h-12 w-11 items-center justify-center active:opacity-60">
          <ChevronRight size={18} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

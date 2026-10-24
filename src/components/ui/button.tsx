import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { triggerHaptic } from '@/services/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-elevated dark:bg-elevated-dark border border-line dark:border-line-dark',
  ghost: 'bg-transparent',
  danger: 'bg-danger/10 border border-danger/30',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-on-brand',
  secondary: 'text-ink dark:text-ink-dark',
  ghost: 'text-primary',
  danger: 'text-danger',
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        triggerHaptic.light();
        onPress();
      }}
      className={`min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3 active:opacity-80 ${CONTAINER[variant]} ${inactive ? 'opacity-60' : ''} ${className}`}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? palette.brand.onBrand : palette.brand.primary} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`text-center text-[15px] font-bold ${LABEL[variant]}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

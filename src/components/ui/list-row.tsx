import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { useThemeColors } from '@/constants/theme';

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
  trailing,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
  trailing?: ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className={`min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
        last ? '' : 'border-b border-line dark:border-line-dark'
      }`}>
      {icon ? (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-elevated dark:bg-elevated-dark">
          {icon}
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">{subtitle}</Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={18} color={colors.faint} /> : null)}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-dark">
      {children}
    </Text>
  );
}

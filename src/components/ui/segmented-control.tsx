import { Pressable, Text, View } from 'react-native';

import { triggerHaptic } from '@/services/haptics';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-2xl bg-elevated p-1 dark:bg-elevated-dark">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              triggerHaptic.selection();
              onChange(option.value);
            }}
            className={`flex-1 items-center rounded-xl py-2.5 ${
              selected ? 'bg-surface dark:bg-surface-dark' : ''
            }`}>
            <Text
              className={`text-[13px] font-semibold ${
                selected ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'
              }`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

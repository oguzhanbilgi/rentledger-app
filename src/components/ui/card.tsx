import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-3xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark ${className}`}>
      {children}
    </View>
  );
}

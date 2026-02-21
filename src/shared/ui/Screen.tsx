import React, { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, ViewStyle } from 'react-native';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = true, contentStyle }: Props) {
  const { colors } = useTheme();

  if (!scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>{children}</SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[{ padding: spacing.lg, gap: spacing.lg }, contentStyle]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

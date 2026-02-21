import React, { PropsWithChildren } from 'react';
import { View, ViewProps } from 'react-native';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export function AppCard({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors } = useTheme();

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface1,
          borderColor: colors.border1,
          borderWidth: 1,
          borderRadius: 16,
          padding: spacing.lg
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

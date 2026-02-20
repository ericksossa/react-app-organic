import React, { PropsWithChildren } from 'react';
import { View, ViewProps } from 'react-native';
import { colors, spacing } from '../theme/tokens';

export function AppCard({ children, style, ...props }: PropsWithChildren<ViewProps>) {
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

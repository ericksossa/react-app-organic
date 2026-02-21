import React from 'react';
import { Text, TextProps } from 'react-native';
import { typography } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = TextProps & {
  variant?: 'title' | 'heading' | 'body' | 'caption';
};

export function AppText({ variant = 'body', style, ...props }: Props) {
  const { colors } = useTheme();
  const fontSize = typography[variant];

  return <Text {...props} style={[{ color: colors.text1, fontSize }, style]} />;
}

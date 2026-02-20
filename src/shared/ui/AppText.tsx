import React from 'react';
import { Text, TextProps } from 'react-native';
import { colors, typography } from '../theme/tokens';

type Props = TextProps & {
  variant?: 'title' | 'heading' | 'body' | 'caption';
};

export function AppText({ variant = 'body', style, ...props }: Props) {
  const fontSize = typography[variant];

  return <Text {...props} style={[{ color: colors.text1, fontSize }, style]} />;
}

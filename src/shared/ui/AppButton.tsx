import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  tone?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ title, tone = 'primary', style, ...props }: Props) {
  const { colors } = useTheme();
  const backgroundColor = tone === 'primary' ? colors.cta : 'transparent';
  const borderWidth = tone === 'ghost' ? 1 : 0;

  return (
    <Pressable
      {...props}
      style={[
        {
          backgroundColor,
          borderRadius: 12,
          borderColor: colors.border1,
          borderWidth,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          alignItems: 'center'
        },
        style
      ]}
    >
      <AppText style={{ color: tone === 'primary' ? colors.ctaText : colors.text1 }}>{title}</AppText>
    </Pressable>
  );
}

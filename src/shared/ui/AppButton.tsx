import React from 'react';
import { Pressable, PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  tone?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  titleNumberOfLines?: number;
};

export function AppButton({
  title,
  tone = 'primary',
  style,
  titleStyle,
  titleNumberOfLines,
  ...props
}: Props) {
  const { colors } = useTheme();
  const backgroundColor = tone === 'primary' ? colors.cta : 'transparent';
  const borderWidth = tone === 'ghost' ? 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
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
      <AppText
        numberOfLines={titleNumberOfLines}
        style={[{ color: tone === 'primary' ? colors.ctaText : colors.text1 }, titleStyle]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

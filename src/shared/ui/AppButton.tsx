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
  const isDisabled = !!props.disabled;

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [
        {
          backgroundColor: isDisabled
            ? tone === 'primary'
              ? '#6b7470'
              : 'rgba(120,130,124,0.24)'
            : backgroundColor,
          borderRadius: 12,
          borderColor: isDisabled ? '#8b948f' : colors.border1,
          borderWidth: isDisabled ? 1 : borderWidth,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          alignItems: 'center',
          opacity: pressed && !isDisabled ? 0.88 : 1
        },
        style
      ]}
    >
      <AppText
        numberOfLines={titleNumberOfLines}
        style={[
          {
            color: isDisabled
              ? tone === 'primary'
                ? '#f2f5f3'
                : '#b8c1bc'
              : tone === 'primary'
                ? colors.ctaText
                : colors.text1
          },
          titleStyle
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

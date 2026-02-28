import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../shared/theme/useTheme';

type VoiceHeaderProps = {
  title?: string;
  onBackPress?: () => void;
  onProfilePress?: () => void;
};

export function VoiceHeader({ title = 'Análisis de voz', onBackPress, onProfilePress }: VoiceHeaderProps) {
  const { isDark } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBackPress}
        style={[styles.iconButton, isDark && styles.iconButtonDark]}
      >
        <Feather name="chevron-left" size={20} color={isDark ? '#FFFFFF' : 'rgba(28,28,30,0.7)'} />
      </Pressable>

      <Text numberOfLines={1} style={[styles.title, isDark && styles.titleDark]}>
        {title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        onPress={onProfilePress}
        style={[styles.iconButton, isDark && styles.iconButtonDark]}
      >
        <Feather name="user" size={19} color={isDark ? '#FFFFFF' : 'rgba(28,28,30,0.7)'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)'
  },
  iconButtonDark: {
    backgroundColor: 'rgba(224,240,233,0.14)'
  },
  title: {
    color: 'rgba(28,28,30,0.8)',
    fontSize: 16,
    fontWeight: '600'
  },
  titleDark: {
    color: '#FFFFFF'
  }
});

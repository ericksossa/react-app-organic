import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type VoiceCopyProps = {
  title?: string;
  subtitle?: string;
};

export function VoiceCopy({ title = 'Toca para hablar', subtitle = 'Busca tomate.' }: VoiceCopyProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 6
  },
  title: {
    color: '#1C1C1E',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3
  },
  subtitle: {
    marginTop: 14,
    color: 'rgba(28,28,30,0.78)',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center'
  }
});

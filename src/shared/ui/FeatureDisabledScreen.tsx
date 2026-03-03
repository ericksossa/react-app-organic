import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useTheme } from '../theme/useTheme';

type FeatureDisabledScreenProps = {
  title?: string;
  description?: string;
};

export function FeatureDisabledScreen({
  title = 'Funcionalidad desactivada',
  description = 'Esta funcionalidad se encuentra apagada por configuracion de entorno.'
}: FeatureDisabledScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { borderColor: colors.border1, backgroundColor: colors.surface1 }]}>
        <AppText style={[styles.title, { color: colors.text1 }]}>{title}</AppText>
        <AppText style={[styles.description, { color: colors.text2 }]}>{description}</AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  title: {
    fontSize: 18,
    fontWeight: '700'
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20
  }
});

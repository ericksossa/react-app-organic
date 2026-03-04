import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../../../shared/ui/Screen';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { ZoneListLoadingSkeleton } from '../../../shared/ui/SkeletonPresets';
import { useTheme } from '../../../shared/theme/useTheme';
import { createMyAddress } from '../../../services/api/addressesApi';
import { listDeliveryZones } from '../../../services/api/availabilityApi';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useAuthStore } from '../../../state/authStore';
import { DeliveryZone } from '../types';

type Step = 0 | 1;

function isActiveZone(zone: DeliveryZone): boolean {
  return zone.isActive !== false;
}

export function AddressOnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const completeAddressOnboarding = useAuthStore((s) => s.completeAddressOnboarding);
  const selectZone = useAvailabilityStore((s) => s.selectZone);
  const { colors, isDark } = useTheme();

  const zonesQuery = useQuery({
    queryKey: ['delivery-zones', 'all-cities'],
    queryFn: () => listDeliveryZones()
  });

  const zones = useMemo(() => (zonesQuery.data ?? []).filter(isActiveZone), [zonesQuery.data]);

  const cities = useMemo(() => {
    const source = zones
      .map((zone) => zone.city?.trim())
      .filter((city): city is string => Boolean(city));
    return Array.from(new Set(source)).sort((a, b) => a.localeCompare(b));
  }, [zones]);

  const [step, setStep] = useState<Step>(0);
  const [city, setCity] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [line1, setLine1] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const stepAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const ambientAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(stepAnim, {
      toValue: step,
      damping: 16,
      mass: 0.7,
      stiffness: 120,
      useNativeDriver: false
    }).start();
  }, [step, stepAnim]);

  useEffect(() => {
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientAnim, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(ambientAnim, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [ambientAnim, titleAnim]);

  const filteredZones = useMemo(() => {
    if (!city) return [];
    return zones.filter((zone) => (zone.city ?? '').trim() === city);
  }, [city, zones]);

  const selectedZone = useMemo(() => zones.find((item) => item.id === zoneId), [zoneId, zones]);

  const createAddressMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (!city || !zoneId || !line1.trim()) {
        throw new Error('invalid_form');
      }

      if (!selectedZone) {
        throw new Error('missing_zone');
      }

      await createMyAddress({
        label: 'Principal',
        fullName: user?.fullName?.trim() || 'Cliente GreenCart',
        line1: line1.trim(),
        city,
        instructions: instructions.trim() || undefined,
        isDefault: true
      });

      await selectZone({ id: selectedZone.id, name: selectedZone.name, city: selectedZone.city });
      completeAddressOnboarding();
    },
    onError: () => {
      setError('No pudimos guardar tu dirección. Inténtalo otra vez.');
    }
  });

  const progressWidth = stepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['50%', '100%']
  });

  const cardsTranslateX = stepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(width - 32)]
  });

  const heroOpacity = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const heroTranslateY = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0]
  });

  const orbScale = ambientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2]
  });

  const orbTranslate = ambientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 18]
  });

  const canGoNext = city.length > 0 && zoneId.length > 0;
  const canSubmit = canGoNext && line1.trim().length > 0;

  const handleNext = () => {
    if (!canGoNext) {
      setError('Elige ciudad y zona para continuar.');
      return;
    }

    setError(null);
    setStep(1);
  };

  const handleBack = () => {
    setError(null);
    setStep(0);
  };

  const surface = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.66)';
  const border = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  const cardWidth = Math.max(width - 32, 280);

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.ambientLayer}>
          <Animated.View
            style={[
              styles.orb,
              {
                backgroundColor: '#0ad1a6',
                opacity: isDark ? 0.22 : 0.28,
                transform: [{ scale: orbScale }, { translateY: orbTranslate }]
              }
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              styles.orbSecondary,
              {
                backgroundColor: '#5d8cff',
                opacity: isDark ? 0.22 : 0.24,
                transform: [{ scale: orbScale }, { translateX: orbTranslate }]
              }
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              styles.orbTertiary,
              {
                backgroundColor: '#ff914d',
                opacity: isDark ? 0.2 : 0.24,
                transform: [{ scale: orbScale }, { translateY: Animated.multiply(orbTranslate, -1) }]
              }
            ]}
          />
        </View>

        <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }}>
          <AppText variant="title" style={styles.title}>
            Configura tu entrega
          </AppText>
          <AppText style={[styles.subtitle, { color: colors.text2 }]}>
            {step === 0
              ? 'Primero elegimos tu zona para mostrarte disponibilidad real.'
              : 'Ahora agrega tu dirección para dejar tu entrega lista en segundos.'}
          </AppText>

          <View style={[styles.progressTrack, { backgroundColor: surface, borderColor: border }]}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.stepperRow}>
            <StepPill index={1} active={step === 0} label="Zona" isDark={isDark} />
            <StepPill index={2} active={step === 1} label="Dirección" isDark={isDark} />
          </View>
        </Animated.View>

        <View style={styles.viewport}>
          <Animated.View
            style={[
              styles.cardsRow,
              { width: cardWidth * 2, transform: [{ translateX: cardsTranslateX }] }
            ]}
          >
            <View style={[styles.card, { width: cardWidth, backgroundColor: surface, borderColor: border }]}>
              <AppText variant="heading">Elige tu ciudad</AppText>
              <View style={styles.chipsWrap}>
                {cities.map((item) => {
                  const selected = city === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setCity(item);
                        setZoneId('');
                        setError(null);
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? 'transparent' : border,
                          backgroundColor: selected ? '#00c896' : 'transparent'
                        }
                      ]}
                    >
                      <AppText style={{ color: selected ? '#08130f' : colors.text1 }}>{item}</AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppText variant="heading" style={styles.sectionTitle}>
                Elige tu zona de entrega
              </AppText>
              {zonesQuery.isLoading ? (
                <View style={styles.zoneSkeletonWrap}>
                  <AppText style={{ color: colors.text2 }}>Buscando zonas disponibles...</AppText>
                  <ZoneListLoadingSkeleton />
                </View>
              ) : null}
              {!city ? <AppText style={{ color: colors.text2 }}>Primero elige tu ciudad para mostrar zonas.</AppText> : null}
              {city && filteredZones.length === 0 ? (
                <AppText style={{ color: colors.text2 }}>Hoy no hay cobertura en esta ciudad. Pronto abriremos nuevas zonas.</AppText>
              ) : null}

              <View style={styles.zonesList}>
                {filteredZones.map((zone) => {
                  const selected = zone.id === zoneId;
                  return (
                    <Pressable
                      key={zone.id}
                      onPress={() => {
                        setZoneId(zone.id);
                        setError(null);
                      }}
                      style={[
                        styles.zoneCard,
                        {
                          borderColor: selected ? '#6bd6ff' : border,
                          backgroundColor: selected ? (isDark ? 'rgba(95,190,255,0.15)' : 'rgba(95,190,255,0.2)') : 'transparent'
                        }
                      ]}
                    >
                      <AppText>{zone.name}</AppText>
                      {selected ? <AppText style={styles.selectedTag}>Elegida</AppText> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.card, { width: cardWidth, backgroundColor: surface, borderColor: border }]}>
              <AppText variant="heading">Tu dirección</AppText>
              <AppText style={[styles.inputLabel, { color: colors.text2 }]}>Dirección principal</AppText>
              <TextInput
                placeholder="Ej: Calle 84 #12-33"
                placeholderTextColor={colors.text2}
                value={line1}
                onChangeText={setLine1}
                style={[styles.input, { color: colors.text1, borderColor: border, backgroundColor: colors.bg }]}
              />

              <AppText style={[styles.inputLabel, { color: colors.text2 }]}>Referencias de entrega (opcional)</AppText>
              <TextInput
                placeholder="Apto, torre, portería..."
                placeholderTextColor={colors.text2}
                value={instructions}
                onChangeText={setInstructions}
                style={[styles.input, styles.inputMultiline, { color: colors.text1, borderColor: border, backgroundColor: colors.bg }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={[styles.summaryCard, { borderColor: border, backgroundColor: isDark ? '#0f201a' : '#dff8ef' }]}>
                <AppText style={styles.summaryTitle}>Resumen rápido</AppText>
                <AppText style={{ color: colors.text2 }}>{city || 'Sin ciudad elegida'}</AppText>
                <AppText>{selectedZone?.name || 'Sin zona elegida'}</AppText>
              </View>
            </View>
          </Animated.View>
        </View>

        {zonesQuery.isError ? <AppText style={{ color: colors.danger }}>No logramos cargar las zonas. Intenta de nuevo.</AppText> : null}
        {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

        <View style={styles.actionsRow}>
          {step === 1 ? <AppButton title="Volver" tone="ghost" onPress={handleBack} style={styles.secondaryAction} /> : null}

          <AppButton
            title={
              step === 0
                ? 'Guardar y continuar'
                : createAddressMutation.isPending
                  ? 'Guardando tu dirección...'
                  : 'Guardar y finalizar'
            }
            onPress={step === 0 ? handleNext : () => createAddressMutation.mutate()}
            disabled={
              zonesQuery.isLoading ||
              createAddressMutation.isPending ||
              (step === 0 ? !canGoNext : !canSubmit)
            }
            style={styles.primaryAction}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type StepPillProps = {
  index: number;
  active: boolean;
  label: string;
  isDark: boolean;
};

function StepPill({ index, active, label, isDark }: StepPillProps) {
  return (
    <View
      style={[
        styles.stepPill,
        {
          backgroundColor: active ? '#1ce0b0' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          borderColor: active ? 'transparent' : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
        }
      ]}
    >
      <AppText style={{ color: active ? '#07120f' : undefined }}>{index}. {label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 14
  },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden'
  },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    top: -30,
    right: -70
  },
  orbSecondary: {
    width: 180,
    height: 180,
    borderRadius: 180,
    top: 130,
    left: -60
  },
  orbTertiary: {
    width: 150,
    height: 150,
    borderRadius: 150,
    bottom: 60,
    right: 20
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 21
  },
  progressTrack: {
    marginTop: 16,
    height: 10,
    borderRadius: 99,
    borderWidth: 1,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#26d9aa'
  },
  stepperRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1
  },
  viewport: {
    flex: 1,
    overflow: 'hidden'
  },
  cardsRow: {
    flexDirection: 'row',
    flex: 1
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 10
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    borderRadius: 99,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  sectionTitle: {
    marginTop: 10
  },
  zoneSkeletonWrap: {
    gap: 8
  },
  zonesList: {
    gap: 8,
    marginTop: 4
  },
  zoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2
  },
  selectedTag: {
    fontSize: 12,
    color: '#3ec6ff'
  },
  inputLabel: {
    marginTop: 8,
    fontSize: 14
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  inputMultiline: {
    minHeight: 96
  },
  summaryCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  secondaryAction: {
    flex: 0.8
  },
  primaryAction: {
    flex: 1.3
  }
});

import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../../../shared/ui/Screen';
import { AppText } from '../../../shared/ui/AppText';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppButton } from '../../../shared/ui/AppButton';
import { colors } from '../../../shared/theme/tokens';
import { listDeliveryZones } from '../../../services/api/availabilityApi';
import { createMyAddress } from '../../../services/api/addressesApi';
import { useAuthStore } from '../../../state/authStore';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { DeliveryZone } from '../types';

function isActiveZone(zone: DeliveryZone): boolean {
  return zone.isActive !== false;
}

export function AddressOnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const completeAddressOnboarding = useAuthStore((s) => s.completeAddressOnboarding);
  const selectZone = useAvailabilityStore((s) => s.selectZone);

  const zonesQuery = useQuery({
    queryKey: ['delivery-zones', 'all-cities'],
    queryFn: () => listDeliveryZones()
  });

  const zones = useMemo(
    () => (zonesQuery.data ?? []).filter(isActiveZone),
    [zonesQuery.data]
  );

  const cities = useMemo(() => {
    const source = zones
      .map((zone) => zone.city?.trim())
      .filter((city): city is string => Boolean(city));
    return Array.from(new Set(source)).sort((a, b) => a.localeCompare(b));
  }, [zones]);

  const [city, setCity] = useState<string>('');
  const [zoneId, setZoneId] = useState<string>('');
  const [line1, setLine1] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredZones = useMemo(() => {
    if (!city) return [];
    return zones.filter((zone) => (zone.city ?? '').trim() === city);
  }, [city, zones]);

  const createAddressMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (!city || !zoneId || !line1.trim()) {
        throw new Error('invalid_form');
      }

      const zone = zones.find((candidate) => candidate.id === zoneId);
      if (!zone) {
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

      await selectZone({ id: zone.id, name: zone.name, city: zone.city });
      completeAddressOnboarding();
    },
    onError: () => {
      setError('No pudimos guardar tu dirección. Inténtalo otra vez.');
    }
  });

  return (
    <Screen>
      <AppText variant="title">¿Dónde te llevamos tu pedido?</AppText>
      <AppCard>
        <AppText variant="heading">Elige tu ciudad</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {cities.map((item) => (
            <AppButton
              key={item}
              title={item}
              tone={city === item ? 'primary' : 'ghost'}
              onPress={() => {
                setCity(item);
                setZoneId('');
              }}
            />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="heading">Elige tu zona de entrega</AppText>
        {!city ? <AppText>Primero elige tu ciudad para mostrar zonas.</AppText> : null}
        {city && filteredZones.length === 0 ? <AppText>Hoy no hay cobertura en esta ciudad. Pronto abriremos nuevas zonas.</AppText> : null}
        <View style={{ gap: 8, marginTop: 8 }}>
          {filteredZones.map((zone) => (
            <AppButton
              key={zone.id}
              title={zone.name}
              tone={zoneId === zone.id ? 'primary' : 'ghost'}
              onPress={() => setZoneId(zone.id)}
            />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="heading">Tu dirección</AppText>
        <TextInput
          placeholder="Dirección principal"
          placeholderTextColor={colors.text2}
          style={{ color: colors.text1, borderBottomWidth: 1, borderColor: colors.border1, marginBottom: 12 }}
          value={line1}
          onChangeText={setLine1}
        />
        <TextInput
          placeholder="Referencias de entrega (opcional)"
          placeholderTextColor={colors.text2}
          style={{ color: colors.text1, borderBottomWidth: 1, borderColor: colors.border1, marginBottom: 12 }}
          value={instructions}
          onChangeText={setInstructions}
        />
      </AppCard>

      {zonesQuery.isLoading ? <AppText>Buscando zonas disponibles...</AppText> : null}
      {zonesQuery.isError ? <AppText style={{ color: colors.danger }}>No logramos cargar las zonas. Intenta de nuevo.</AppText> : null}
      {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

      <AppButton
        title={createAddressMutation.isPending ? 'Guardando tu dirección...' : 'Guardar y continuar'}
        onPress={() => createAddressMutation.mutate()}
        disabled={createAddressMutation.isPending || zonesQuery.isLoading}
      />
    </Screen>
  );
}

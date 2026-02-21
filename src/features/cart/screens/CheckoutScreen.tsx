import React from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../../../shared/ui/Screen';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { listMyAddresses } from '../../../services/api/addressesApi';
import { createOrder, DeliveryMode } from '../../../services/api/ordersApi';
import { useCartStore } from '../../../state/cartStore';
import { colors } from '../../../shared/theme/tokens';
import { getErrorMessage } from '../../../shared/errors/apiError';
import { useTheme } from '../../../shared/theme/useTheme';

function toIsoOrUndefined(value: string): string | undefined {
  const parsed = value.trim();
  if (!parsed) return undefined;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function CheckoutScreen() {
  const { colors: themeColors, isDark } = useTheme();
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [deliveryMode, setDeliveryMode] = React.useState<DeliveryMode>('own');
  const [slotStartInput, setSlotStartInput] = React.useState('');
  const [slotEndInput, setSlotEndInput] = React.useState('');
  const [createdOrderId, setCreatedOrderId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadCart = useCartStore((s) => s.load);
  const total = useCartStore((s) => s.snapshot?.totals?.total ?? 0);
  const subtotal = useCartStore((s) => s.snapshot?.totals?.subtotal ?? 0);
  const deliveryFee = useCartStore((s) => s.snapshot?.totals?.deliveryFee ?? 0);
  const discount = useCartStore((s) => s.snapshot?.totals?.discount ?? 0);
  const itemsCount = useCartStore((s) => s.snapshot?.items?.length ?? 0);

  const addressesQuery = useQuery({
    queryKey: ['my-addresses-checkout'],
    queryFn: listMyAddresses
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (!selectedAddressId) {
        throw new Error('Selecciona una dirección para continuar.');
      }

      const slotStart = toIsoOrUndefined(slotStartInput);
      const slotEnd = toIsoOrUndefined(slotEndInput);
      if ((slotStartInput.trim() && !slotStart) || (slotEndInput.trim() && !slotEnd)) {
        throw new Error('Formato de fecha inválido. Ejemplo: 2026-03-01 14:00');
      }
      if (slotStart && slotEnd && new Date(slotStart) >= new Date(slotEnd)) {
        throw new Error('La hora de fin debe ser mayor que la hora de inicio.');
      }

      return createOrder({
        addressId: selectedAddressId,
        deliveryMode,
        slotStart,
        slotEnd,
        note: note.trim() || undefined
      });
    },
    onSuccess: async (order) => {
      setCreatedOrderId(order?.id ?? null);
      await loadCart();
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error, 'No se pudo crear la orden.'));
    }
  });

  const addresses = addressesQuery.data ?? [];
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;

  React.useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const preferred = addresses.find((item) => item.isDefault) ?? addresses[0];
      setSelectedAddressId(preferred.id);
    }
  }, [addresses, selectedAddressId]);

  return (
    <Screen>
      <AppText variant="title">Checkout</AppText>

      <AppCard style={[styles.summaryCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]}>
        <AppText variant="heading">Resumen</AppText>
        <AppText style={[styles.meta, { color: themeColors.text2 }]}>{itemsCount} items en tu pedido</AppText>
        <View style={styles.rows}>
          <View style={styles.row}>
            <AppText style={[styles.rowLabel, { color: themeColors.text2 }]}>Subtotal</AppText>
            <AppText>${Number(subtotal).toLocaleString('es-CO')}</AppText>
          </View>
          <View style={styles.row}>
            <AppText style={[styles.rowLabel, { color: themeColors.text2 }]}>Delivery fee</AppText>
            <AppText>${Number(deliveryFee).toLocaleString('es-CO')}</AppText>
          </View>
          {discount > 0 ? (
            <View style={styles.row}>
              <AppText style={[styles.rowLabel, { color: themeColors.text2 }]}>Descuento</AppText>
              <AppText>- ${Number(discount).toLocaleString('es-CO')}</AppText>
            </View>
          ) : null}
        </View>
        <View style={[styles.divider, { backgroundColor: themeColors.border1 }]} />
        <View style={styles.totalRow}>
          <AppText style={styles.totalLabel}>Total</AppText>
          <AppText style={styles.totalValue}>${Number(total).toLocaleString('es-CO')}</AppText>
        </View>
      </AppCard>

      <AppCard style={[styles.addressCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]}>
        <View style={styles.addressHeader}>
          <AppText variant="heading">Dirección de entrega</AppText>
          <AppButton title="Cambiar" tone="ghost" onPress={() => setAddressModalOpen(true)} disabled={addresses.length === 0} />
        </View>

        {selectedAddress ? (
          <View style={{ gap: 4 }}>
            <AppText style={styles.addressTitle}>{selectedAddress.label || 'Principal'}</AppText>
            <AppText>{selectedAddress.line1}{selectedAddress.city ? `, ${selectedAddress.city}` : ''}</AppText>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
              <AppText style={[styles.meta, { color: themeColors.text2 }]}>No tienes una dirección seleccionada.</AppText>
            </View>
          )}
      </AppCard>

      <AppCard style={{ backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }}>
        <AppText variant="heading">Modo de entrega</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <AppButton title="Propia" tone={deliveryMode === 'own' ? 'primary' : 'ghost'} onPress={() => setDeliveryMode('own')} />
          <AppButton
            title="Tercero"
            tone={deliveryMode === 'third_party' ? 'primary' : 'ghost'}
            onPress={() => setDeliveryMode('third_party')}
          />
          <AppButton title="Recoger" tone={deliveryMode === 'pickup' ? 'primary' : 'ghost'} onPress={() => setDeliveryMode('pickup')} />
        </View>
      </AppCard>

      <AppCard style={{ backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }}>
        <AppText variant="heading">Ventana (opcional)</AppText>
        <TextInput
          placeholder="Inicio (ej: 2026-03-01 14:00)"
          placeholderTextColor={themeColors.text2}
          style={[styles.input, { color: themeColors.text1, borderColor: themeColors.border1 }]}
          value={slotStartInput}
          onChangeText={setSlotStartInput}
        />
        <TextInput
          placeholder="Fin (ej: 2026-03-01 16:00)"
          placeholderTextColor={themeColors.text2}
          style={[styles.input, { color: themeColors.text1, borderColor: themeColors.border1 }]}
          value={slotEndInput}
          onChangeText={setSlotEndInput}
        />
        <TextInput
          placeholder="Nota de entrega (opcional)"
          placeholderTextColor={themeColors.text2}
          style={[styles.input, { color: themeColors.text1, borderColor: themeColors.border1 }]}
          value={note}
          onChangeText={setNote}
        />
      </AppCard>

      {errorMessage ? <AppText style={[styles.errorText, { color: themeColors.danger, borderColor: themeColors.danger }]}>{errorMessage}</AppText> : null}
      {createdOrderId ? <AppText style={{ color: '#89c8a3' }}>Orden creada: {createdOrderId}</AppText> : null}

      <AppButton
        title={createOrderMutation.isPending ? 'Creando orden...' : 'Crear orden'}
        onPress={() => createOrderMutation.mutate()}
        disabled={!selectedAddressId || createOrderMutation.isPending || itemsCount === 0}
      />

      <Modal visible={addressModalOpen} transparent animationType="fade" onRequestClose={() => setAddressModalOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)' }]} onPress={() => setAddressModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]} onPress={() => {}}>
            <AppText variant="heading">Selecciona dirección</AppText>
            {addressesQuery.isLoading ? <AppText>Cargando direcciones...</AppText> : null}
            {addressesQuery.isError ? <AppText style={[styles.errorText, { color: themeColors.danger, borderColor: themeColors.danger }]}>No se pudieron cargar direcciones.</AppText> : null}
            <View style={{ gap: 8 }}>
              {addresses.map((address) => (
                <Pressable
                  key={address.id}
                  style={[
                    styles.addressOption,
                    { borderColor: themeColors.border1, backgroundColor: themeColors.surface2 },
                    selectedAddressId === address.id ? styles.addressOptionActive : null
                  ]}
                  onPress={() => {
                    setSelectedAddressId(address.id);
                    setAddressModalOpen(false);
                  }}
                >
                  <View style={styles.addressTop}>
                    <AppText style={{ fontWeight: '700' }}>{address.label || 'Dirección'}</AppText>
                    {selectedAddressId === address.id ? <AppText style={styles.activeBadge}>Activa</AppText> : null}
                  </View>
                  <AppText>{address.line1}{address.city ? `, ${address.city}` : ''}</AppText>
                </Pressable>
              ))}
            </View>
            <AppButton title="Cerrar" tone="ghost" onPress={() => setAddressModalOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 22,
    gap: 10
  },
  meta: {
    color: colors.text2
  },
  rows: {
    gap: 8
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowLabel: {
    color: colors.text2
  },
  divider: {
    height: 1,
    backgroundColor: colors.border1,
    marginVertical: 4
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900'
  },
  addressCard: {
    borderRadius: 20,
    gap: 10
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  addressTitle: {
    fontWeight: '800'
  },
  input: {
    color: colors.text1,
    borderBottomWidth: 1,
    borderColor: colors.border1,
    marginTop: 8,
    paddingBottom: 8
  },
  errorText: {
    color: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 10
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 18
  },
  modalCard: {
    backgroundColor: colors.surface1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border1,
    padding: 14,
    gap: 12
  },
  addressOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface2,
    padding: 12,
    gap: 4
  },
  addressOptionActive: {
    borderColor: '#8cc9a8'
  },
  addressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  activeBadge: {
    fontSize: 12,
    color: '#8cc9a8'
  }
});

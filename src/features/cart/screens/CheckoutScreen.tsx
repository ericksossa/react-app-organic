import React from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../../../shared/ui/Screen';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { AddressListLoadingSkeleton } from '../../../shared/ui/SkeletonPresets';
import { listMyAddresses } from '../../../services/api/addressesApi';
import { createOrder, DeliveryMode } from '../../../services/api/ordersApi';
import { useCartStore } from '../../../state/cartStore';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { colors } from '../../../shared/theme/tokens';
import { getErrorMessage } from '../../../shared/errors/apiError';
import { useTheme } from '../../../shared/theme/useTheme';
import { brandMicrocopy } from '../../../shared/copy/brand-microcopy';

export function CheckoutScreen() {
  const { colors: themeColors, isDark } = useTheme();
  const [currentStep, setCurrentStep] = React.useState<1 | 2>(1);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = React.useState(false);
  const [deliveryModeModalOpen, setDeliveryModeModalOpen] = React.useState(false);
  const [paymentModeModalOpen, setPaymentModeModalOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [deliveryMode, setDeliveryMode] = React.useState<DeliveryMode>('own');
  const [paymentMethod, setPaymentMethod] = React.useState<'card' | 'cash'>('card');
  const [contactPhone, setContactPhone] = React.useState('');
  const [createdOrderId, setCreatedOrderId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadCart = useCartStore((s) => s.load);
  const cartItems = useCartStore((s) => s.snapshot?.items ?? []);
  const total = useCartStore((s) => s.snapshot?.totals?.total ?? 0);
  const subtotal = useCartStore((s) => s.snapshot?.totals?.subtotal ?? 0);
  const deliveryFee = useCartStore((s) => s.snapshot?.totals?.deliveryFee ?? 0);
  const discount = useCartStore((s) => s.snapshot?.totals?.discount ?? 0);
  const itemsCount = useCartStore((s) => s.snapshot?.items?.length ?? 0);
  const selectedZone = useAvailabilityStore((s) => s.selectedZone);

  const addressesQuery = useQuery({
    queryKey: ['my-addresses-checkout'],
    queryFn: listMyAddresses
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (!selectedAddressId) {
        throw new Error('Elige una dirección para continuar.');
      }

      return createOrder({
        addressId: selectedAddressId,
        deliveryMode,
        note: note.trim() || undefined
      });
    },
    onSuccess: async (order) => {
      setCreatedOrderId(order?.id ?? null);
      await loadCart();
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error, 'No pudimos crear tu pedido. Intenta de nuevo.'));
    }
  });

  const addresses = addressesQuery.data ?? [];
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const selectedAddressWithPhone = selectedAddress as (typeof selectedAddress & { phone?: string }) | null;
  const zoneLabel = selectedZone?.name || selectedZone?.city || selectedAddress?.city || 'Sin zona asignada';

  const deliveryModeLabel: Record<DeliveryMode, string> = {
    not_defined: 'Seleccionar al confirmar',
    own: 'Entrega GreenCart (recomendada)',
    third_party: 'Aliado logístico',
    pickup: 'Recoger en punto'
  };

  const paymentMethodLabel: Record<'card' | 'cash', string> = {
    card: 'Tarjeta débito/crédito',
    cash: 'Pago contraentrega'
  };

  React.useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const preferred = addresses.find((item) => item.isDefault) ?? addresses[0];
      setSelectedAddressId(preferred.id);
    }
  }, [addresses, selectedAddressId]);

  React.useEffect(() => {
    if (!selectedAddressWithPhone?.phone) return;
    setContactPhone((prev) => (prev.trim().length > 0 ? prev : selectedAddressWithPhone.phone || ''));
  }, [selectedAddressWithPhone?.phone]);

  return (
    <Screen>
      <AppText variant="title">Confirmar cosecha</AppText>
      <AppText style={[styles.meta, { color: themeColors.text2 }]}>
        {currentStep === 1
          ? 'Paso 1 de 2 · Revisa tu pedido antes de confirmar.'
          : 'Paso 2 de 2 · Completa tus datos y deja lista la entrega.'}
      </AppText>

      <View style={styles.stepsRow}>
        <Pressable
          style={[
            styles.stepPill,
            { borderColor: currentStep === 1 ? '#2d6a4f' : themeColors.border1, backgroundColor: currentStep === 1 ? '#e6f4ec' : themeColors.surface1 }
          ]}
          onPress={() => setCurrentStep(1)}
        >
          <AppText style={[styles.stepPillNumber, { color: '#2d6a4f' }]}>1</AppText>
          <AppText style={styles.stepPillText}>Resumen</AppText>
        </Pressable>
        <Pressable
          style={[
            styles.stepPill,
            { borderColor: currentStep === 2 ? '#2d6a4f' : themeColors.border1, backgroundColor: currentStep === 2 ? '#e6f4ec' : themeColors.surface1 }
          ]}
          onPress={() => {
            if (itemsCount > 0) setCurrentStep(2);
          }}
        >
          <AppText style={[styles.stepPillNumber, { color: '#2d6a4f' }]}>2</AppText>
          <AppText style={styles.stepPillText}>Datos y pago</AppText>
        </Pressable>
      </View>

      {currentStep === 1 ? (
        <AppCard style={[styles.summaryCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]}>
          <AppText variant="heading">Resumen de tu pedido</AppText>
          <AppText style={[styles.meta, { color: themeColors.text2 }]}>{itemsCount} productos seleccionados hoy</AppText>
          <View style={styles.itemsList}>
            {cartItems.map((item) => (
              <View key={item.id} style={[styles.itemRow, { backgroundColor: themeColors.surface2 }]}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.itemName}>{item.name}</AppText>
                  <AppText style={[styles.itemMeta, { color: themeColors.text2 }]}>
                    {item.qty} x ${Number(item.unitPrice).toLocaleString('es-CO')}
                  </AppText>
                </View>
                <AppText style={styles.itemPrice}>${Number(item.qty * item.unitPrice).toLocaleString('es-CO')}</AppText>
              </View>
            ))}
          </View>
          {cartItems.length === 0 ? <AppText style={[styles.meta, { color: themeColors.text2 }]}>No hay productos en tu pedido.</AppText> : null}
          <View style={styles.rows}>
            <View style={styles.row}>
              <AppText style={[styles.rowLabel, { color: themeColors.text2 }]}>Subtotal</AppText>
              <AppText style={styles.totalAccent}>${Number(subtotal).toLocaleString('es-CO')}</AppText>
            </View>
            {deliveryFee > 0 ? (
              <View style={styles.row}>
                <AppText style={[styles.rowLabel, { color: themeColors.text2 }]}>Costo de entrega</AppText>
                <AppText style={styles.totalAccent}>${Number(deliveryFee).toLocaleString('es-CO')}</AppText>
              </View>
            ) : null}
            {discount > 0 ? (
              <View style={styles.row}>
                <AppText style={[styles.rowLabel, { color: themeColors.text2 }]}>Descuento</AppText>
                <AppText style={styles.totalAccent}>- ${Number(discount).toLocaleString('es-CO')}</AppText>
              </View>
            ) : null}
            <View style={styles.row}>
              <AppText style={[styles.totalLabelInline, { color: themeColors.text1 }]}>Total</AppText>
              <AppText style={styles.totalAccentLarge}>${Number(total).toLocaleString('es-CO')}</AppText>
            </View>
          </View>
          <AppButton title="Continuar con datos de entrega" onPress={() => setCurrentStep(2)} disabled={itemsCount === 0} />
        </AppCard>
      ) : null}

      {currentStep === 2 ? (
        <AppCard style={[styles.formCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]}>
          <AppText variant="heading">Confirmar tu pedido</AppText>

          <View style={[styles.sectionCard, { borderColor: themeColors.border1, backgroundColor: themeColors.surface1 }]}>
            <AppText style={styles.sectionTitle}>Datos de entrega</AppText>

            <AppText style={[styles.fieldLabel, { color: themeColors.text2 }]}>Zona de entrega</AppText>
            <View style={[styles.readonlyInput, { borderColor: themeColors.border1 }]}>
              <AppText>{zoneLabel}</AppText>
            </View>

            <AppText style={[styles.fieldLabel, { color: themeColors.text2 }]}>Dirección de entrega</AppText>
            <Pressable
              style={[styles.selectInput, { borderColor: themeColors.border1 }]}
              onPress={() => setAddressModalOpen(true)}
              disabled={addresses.length === 0}
            >
              <AppText numberOfLines={1}>
                {selectedAddress ? `${selectedAddress.label || 'Principal'} • ${selectedAddress.line1}${selectedAddress.city ? ` • ${selectedAddress.city}` : ''}` : 'Selecciona una dirección'}
              </AppText>
              <AppText style={[styles.selectChevron, { color: themeColors.text2 }]}>⌄</AppText>
            </Pressable>

            <AppText style={[styles.fieldLabel, { color: themeColors.text2 }]}>Teléfono de contacto</AppText>
            <TextInput
              placeholder="Ej. 3001234567"
              placeholderTextColor={themeColors.text2}
              keyboardType="phone-pad"
              style={[styles.outlinedInput, { color: themeColors.text1, borderColor: themeColors.border1 }]}
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            <AppText style={[styles.fieldLabel, { color: themeColors.text2 }]}>Nota para el repartidor</AppText>
            <TextInput
              placeholder="Ej. Portería, timbre o referencia de entrega"
              placeholderTextColor={themeColors.text2}
              multiline
              style={[styles.outlinedInput, styles.textarea, { color: themeColors.text1, borderColor: themeColors.border1 }]}
              value={note}
              onChangeText={setNote}
            />
          </View>

          <View style={[styles.sectionCard, { borderColor: themeColors.border1, backgroundColor: themeColors.surface1 }]}>
            <AppText style={styles.sectionTitle}>Entrega y pago</AppText>

            <AppText style={[styles.fieldLabel, { color: themeColors.text2 }]}>¿Cómo quieres recibir tu pedido?</AppText>
            <Pressable style={[styles.selectInput, { borderColor: themeColors.border1 }]} onPress={() => setDeliveryModeModalOpen(true)}>
              <AppText numberOfLines={1}>{deliveryModeLabel[deliveryMode]}</AppText>
              <AppText style={[styles.selectChevron, { color: themeColors.text2 }]}>⌄</AppText>
            </Pressable>

            <AppText style={[styles.fieldLabel, { color: themeColors.text2 }]}>Método de pago</AppText>
            <Pressable style={[styles.selectInput, { borderColor: themeColors.border1 }]} onPress={() => setPaymentModeModalOpen(true)}>
              <AppText numberOfLines={1}>{paymentMethodLabel[paymentMethod]}</AppText>
              <AppText style={[styles.selectChevron, { color: themeColors.text2 }]}>⌄</AppText>
            </Pressable>
          </View>

          <View style={styles.checkoutActions}>
            <AppButton title="Volver al resumen" tone="ghost" onPress={() => setCurrentStep(1)} />
            <AppButton
              title={createOrderMutation.isPending ? 'Creando tu pedido...' : brandMicrocopy.buttons.checkout}
              onPress={() => createOrderMutation.mutate()}
              disabled={!selectedAddressId || createOrderMutation.isPending || itemsCount === 0}
            />
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? <AppText style={[styles.errorText, { color: themeColors.danger, borderColor: themeColors.danger }]}>{errorMessage}</AppText> : null}
      {createdOrderId ? (
        <View style={{ gap: 4 }}>
          <AppText style={{ color: '#89c8a3' }}>{brandMicrocopy.confirmations.orderCreated(createdOrderId)}</AppText>
          <AppText style={[styles.meta, { color: themeColors.text2 }]}>{brandMicrocopy.confirmations.orderCreatedSecondary}</AppText>
        </View>
      ) : null}

      <Modal visible={addressModalOpen} transparent animationType="fade" onRequestClose={() => setAddressModalOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)' }]} onPress={() => setAddressModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]} onPress={() => {}}>
            <AppText variant="heading">Elige una dirección</AppText>
            {addressesQuery.isLoading ? (
              <View style={styles.addressSkeletonWrap}>
                <AppText>Cargando tus direcciones...</AppText>
                <AddressListLoadingSkeleton />
              </View>
            ) : null}
            {addressesQuery.isError ? <AppText style={[styles.errorText, { color: themeColors.danger, borderColor: themeColors.danger }]}>No pudimos cargar tus direcciones. Intenta de nuevo.</AppText> : null}
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
                    <AppText style={{ fontWeight: '700' }}>{address.label || 'Dirección guardada'}</AppText>
                    {selectedAddressId === address.id ? <AppText style={styles.activeBadge}>Seleccionada</AppText> : null}
                  </View>
                  <AppText>{address.line1}{address.city ? `, ${address.city}` : ''}</AppText>
                </Pressable>
              ))}
            </View>
            <AppButton title="Listo" tone="ghost" onPress={() => setAddressModalOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={deliveryModeModalOpen} transparent animationType="fade" onRequestClose={() => setDeliveryModeModalOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)' }]} onPress={() => setDeliveryModeModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]} onPress={() => {}}>
            <AppText variant="heading">Método de entrega</AppText>
            <View style={{ gap: 8 }}>
              {(['own', 'third_party', 'pickup'] as DeliveryMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={[
                    styles.addressOption,
                    { borderColor: themeColors.border1, backgroundColor: themeColors.surface2 },
                    deliveryMode === mode ? styles.addressOptionActive : null
                  ]}
                  onPress={() => {
                    setDeliveryMode(mode);
                    setDeliveryModeModalOpen(false);
                  }}
                >
                  <AppText style={{ fontWeight: '700' }}>{deliveryModeLabel[mode]}</AppText>
                </Pressable>
              ))}
            </View>
            <AppButton title="Listo" tone="ghost" onPress={() => setDeliveryModeModalOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={paymentModeModalOpen} transparent animationType="fade" onRequestClose={() => setPaymentModeModalOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)' }]} onPress={() => setPaymentModeModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]} onPress={() => {}}>
            <AppText variant="heading">Método de pago</AppText>
            <View style={{ gap: 8 }}>
              {(Object.keys(paymentMethodLabel) as Array<'card' | 'cash'>).map((method) => (
                <Pressable
                  key={method}
                  style={[
                    styles.addressOption,
                    { borderColor: themeColors.border1, backgroundColor: themeColors.surface2 },
                    paymentMethod === method ? styles.addressOptionActive : null
                  ]}
                  onPress={() => {
                    setPaymentMethod(method);
                    setPaymentModeModalOpen(false);
                  }}
                >
                  <AppText style={{ fontWeight: '700' }}>{paymentMethodLabel[method]}</AppText>
                </Pressable>
              ))}
            </View>
            <AppButton title="Listo" tone="ghost" onPress={() => setPaymentModeModalOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepsRow: {
    flexDirection: 'row',
    gap: 10
  },
  stepPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stepPillNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '800',
    overflow: 'hidden',
    backgroundColor: '#d6ecdf'
  },
  stepPillText: {
    fontSize: 15,
    fontWeight: '700'
  },
  formCard: {
    borderRadius: 22,
    gap: 14
  },
  summaryCard: {
    borderRadius: 22,
    gap: 12
  },
  meta: {
    color: colors.text2
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '800'
  },
  fieldLabel: {
    fontSize: 16,
    marginTop: 4
  },
  readonlyInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    justifyContent: 'center'
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  selectChevron: {
    fontSize: 18,
    lineHeight: 18
  },
  outlinedInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top'
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
  totalLabelInline: {
    fontSize: 18,
    fontWeight: '800'
  },
  totalAccent: {
    fontWeight: '800',
    color: '#2d6a4f'
  },
  totalAccentLarge: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2d6a4f'
  },
  checkoutActions: {
    gap: 10
  },
  itemsList: {
    gap: 8
  },
  itemRow: {
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  itemName: {
    fontWeight: '800'
  },
  itemMeta: {
    fontSize: 14
  },
  itemPrice: {
    fontWeight: '800'
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
  addressSkeletonWrap: {
    gap: 8
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

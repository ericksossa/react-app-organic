import React from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/ui/Screen';
import { AppText } from '../../../shared/ui/AppText';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppButton } from '../../../shared/ui/AppButton';
import { colors } from '../../../shared/theme/tokens';
import { getOrderDetail } from '../../../services/api/ordersApi';
import { initPayment, PaymentInitResult, PaymentProvider } from '../../../services/api/paymentsApi';
import { getErrorMessage } from '../../../shared/errors/apiError';
import { OrdersFlowParamList } from '../types';
import { launchPaymentRedirect } from '../../../services/payments/paymentFlow';

type Props = NativeStackScreenProps<OrdersFlowParamList, 'OrderDetail'>;

export function OrderDetailScreen({ route }: Props) {
  const [selectedProvider, setSelectedProvider] = React.useState<PaymentProvider>('wompi');
  const [paymentResult, setPaymentResult] = React.useState<PaymentInitResult | null>(null);
  const [paymentMessage, setPaymentMessage] = React.useState<string | null>(null);
  const [awaitingPaymentReturn, setAwaitingPaymentReturn] = React.useState(false);

  const orderQuery = useQuery({
    queryKey: ['order-detail', route.params.id],
    queryFn: () => getOrderDetail(route.params.id)
  });

  const paymentMutation = useMutation({
    mutationFn: async (provider: PaymentProvider) => {
      setPaymentMessage(null);
      setPaymentResult(null);
      return initPayment(route.params.id, { provider });
    },
    onSuccess: async (result) => {
      setPaymentResult(result);

      if (!result.redirectUrl) {
        setPaymentMessage(result.message ?? `Pago ${result.status}`);
        return;
      }

      const launch = await launchPaymentRedirect(result);
      if (!launch.opened) {
        setPaymentMessage('El proveedor no devolvio una URL de pago valida.');
        return;
      }

      setAwaitingPaymentReturn(true);
      const label = launch.mode === 'in_app' ? 'in-app' : 'web';
      setPaymentMessage(`Pago inicializado. Redireccion ${label} abierta.`);
    },
    onError: (error) => {
      setPaymentMessage(getErrorMessage(error, 'No se pudo iniciar el pago.'));
    }
  });

  const order = orderQuery.data;

  React.useEffect(() => {
    if (!awaitingPaymentReturn) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void orderQuery.refetch();
        setAwaitingPaymentReturn(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [awaitingPaymentReturn, orderQuery]);

  React.useEffect(() => {
    const listener = Linking.addEventListener('url', (event) => {
      if (event.url.includes('/orders/')) {
        void orderQuery.refetch();
      }
    });

    return () => {
      listener.remove();
    };
  }, [orderQuery]);

  return (
    <Screen contentStyle={{ paddingTop: 14, paddingBottom: 24 }}>
      <AppText variant="title">Detalle de orden</AppText>
      {orderQuery.isLoading ? (
        <AppCard style={styles.stateCard}>
          <AppText style={{ color: colors.text2 }}>Cargando detalle...</AppText>
        </AppCard>
      ) : null}
      {orderQuery.isError ? (
        <AppCard style={styles.stateCard}>
          <AppText variant="heading">No pudimos cargar la orden</AppText>
          <AppText style={{ color: colors.danger }}>Intenta nuevamente en unos segundos.</AppText>
        </AppCard>
      ) : null}

      {order ? (
        <>
          <AppCard style={styles.card}>
            <AppText variant="heading">#{order.id}</AppText>
            <AppText style={styles.meta}>Estado: {order.status}</AppText>
            {order.createdAt ? (
              <AppText style={styles.meta}>Creada: {new Date(order.createdAt).toLocaleString('es-CO')}</AppText>
            ) : null}
            <AppText style={styles.meta}>Total: ${Number(order.total ?? 0).toLocaleString('es-CO')}</AppText>
            {order.deliveryMode ? <AppText style={styles.meta}>Entrega: {order.deliveryMode}</AppText> : null}
          </AppCard>

          <AppCard style={styles.card}>
            <AppText variant="heading">Items</AppText>
            <View style={styles.itemsWrap}>
              {(order.items ?? []).length > 0 ? (
                (order.items ?? []).map((item, index) => (
                  <View key={`${item.id ?? index}`} style={styles.itemRow}>
                    <AppText style={styles.itemName}>{item.name}</AppText>
                    <AppText style={styles.itemMeta}>x{item.qty}</AppText>
                    <AppText style={styles.itemMeta}>${Number(item.unitPrice).toLocaleString('es-CO')}</AppText>
                  </View>
                ))
              ) : (
                <AppText style={styles.muted}>La respuesta no incluyo items.</AppText>
              )}
            </View>
          </AppCard>

          <AppCard style={[styles.card, styles.paymentCard]}>
            <AppText variant="heading">Pago</AppText>
            <AppText style={styles.meta}>Inicia el pago para esta orden desde el proveedor que prefieras.</AppText>

            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => setSelectedProvider('wompi')}
                style={[styles.segmentButton, selectedProvider === 'wompi' && styles.segmentButtonActive]}
              >
                <AppText style={[styles.segmentText, selectedProvider === 'wompi' && styles.segmentTextActive]}>
                  Wompi
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setSelectedProvider('mercadopago')}
                style={[styles.segmentButton, selectedProvider === 'mercadopago' && styles.segmentButtonActive]}
              >
                <AppText
                  style={[styles.segmentText, selectedProvider === 'mercadopago' && styles.segmentTextActive]}
                >
                  Mercado Pago
                </AppText>
              </Pressable>
            </View>

            <AppButton
              title={paymentMutation.isPending ? 'Inicializando...' : 'Iniciar pago'}
              onPress={() => paymentMutation.mutate(selectedProvider)}
              disabled={paymentMutation.isPending}
            />

            {paymentMutation.isPending ? (
              <View style={styles.loadingState}>
                <AppText style={{ color: colors.text2 }}>Inicializando pago...</AppText>
              </View>
            ) : null}

            {paymentMutation.isError ? (
              <View style={styles.errorState}>
                <AppText style={{ color: colors.danger }}>{paymentMessage ?? 'No se pudo iniciar el pago.'}</AppText>
              </View>
            ) : null}

            {paymentResult && !paymentMutation.isPending && !paymentMutation.isError ? (
              <View style={styles.okState}>
                <AppText style={styles.okText}>Estado: {paymentResult.status}</AppText>
                {paymentResult.providerReference ? (
                  <AppText style={styles.okText}>Referencia: {paymentResult.providerReference}</AppText>
                ) : null}
                {paymentResult.message ? <AppText style={styles.okText}>{paymentResult.message}</AppText> : null}
              </View>
            ) : null}

            {awaitingPaymentReturn ? (
              <AppText style={{ color: colors.text2 }}>
                Esperando retorno del proveedor para refrescar estado...
              </AppText>
            ) : null}
            {paymentMessage ? <AppText style={{ color: colors.text2 }}>{paymentMessage}</AppText> : null}
          </AppCard>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: colors.surface2,
    gap: 6
  },
  meta: {
    color: colors.text2
  },
  itemsWrap: {
    marginTop: 6,
    gap: 8
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface1,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  itemName: {
    flex: 1
  },
  itemMeta: {
    color: colors.text2,
    fontSize: 14
  },
  muted: {
    color: colors.text2
  },
  stateCard: {
    borderRadius: 16,
    backgroundColor: colors.surface2,
    gap: 6
  },
  paymentCard: {
    gap: 12
  },
  segmentWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface1,
    padding: 4,
    flexDirection: 'row',
    gap: 6
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center'
  },
  segmentButtonActive: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border1
  },
  segmentText: {
    color: colors.text2,
    fontSize: 14,
    fontWeight: '700'
  },
  segmentTextActive: {
    color: colors.text1
  },
  loadingState: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface1,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  errorState: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,74,74,0.45)',
    backgroundColor: 'rgba(201,74,74,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  okState: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(111,168,138,0.45)',
    backgroundColor: 'rgba(111,168,138,0.14)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4
  },
  okText: {
    color: colors.text1
  }
});

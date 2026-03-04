import React from 'react';
import { FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../shared/ui/AppText';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppButton } from '../../../shared/ui/AppButton';
import { OrdersListLoadingSkeleton } from '../../../shared/ui/SkeletonPresets';
import { colors } from '../../../shared/theme/tokens';
import { useTheme } from '../../../shared/theme/useTheme';
import { OrderDetail, listOrders } from '../../../services/api/ordersApi';
import { OrdersFlowParamList } from '../types';
import { Reveal } from '../../../design/motion/Reveal';

type Props = NativeStackScreenProps<OrdersFlowParamList, 'OrdersMain'>;
type OrderStatusFilter = 'all' | 'active' | 'delivered' | 'canceled';

const OrderRow = React.memo(function OrderRow({
  order,
  onOpen,
  statusTone
}: {
  order: OrderDetail;
  onOpen: (id: string) => void;
  statusTone: { bg: string; border: string; text: string; label: string };
}) {
  return (
    <Pressable style={styles.orderRow} onPress={() => onOpen(order.id)}>
      <View style={{ flex: 1 }}>
        <AppText style={styles.orderId}>#{order.id}</AppText>
        <View style={[styles.statusPill, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
          <AppText style={[styles.statusPillText, { color: statusTone.text }]}>{statusTone.label}</AppText>
        </View>
        {order.createdAt ? (
          <AppText style={styles.orderMeta}>{new Date(order.createdAt).toLocaleString('es-CO')}</AppText>
        ) : null}
      </View>
      <AppText style={styles.orderTotal}>${Number(order.total ?? order.subtotal ?? 0).toLocaleString('es-CO')}</AppText>
    </Pressable>
  );
});

export function OrdersScreen({ navigation }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const [statusFilter, setStatusFilter] = React.useState<OrderStatusFilter>('all');
  const ordersQuery = useQuery({
    queryKey: ['orders-list', 1, 20],
    queryFn: () => listOrders(1, 20),
    staleTime: 0,
    refetchOnMount: 'always'
  });

  useFocusEffect(
    React.useCallback(() => {
      void ordersQuery.refetch();
    }, [ordersQuery])
  );

  const allOrders = ordersQuery.data?.data ?? [];
  const orders = React.useMemo(() => {
    const rows = allOrders;
    if (statusFilter === 'all') return rows;

    if (statusFilter === 'delivered') {
      return rows.filter((order) => normalizeStatus(order.status) === 'delivered');
    }

    if (statusFilter === 'canceled') {
      return rows.filter((order) => normalizeStatus(order.status) === 'canceled');
    }

    return rows.filter((order) => {
      const normalized = normalizeStatus(order.status);
      return normalized === 'created' || normalized === 'confirmed' || normalized === 'preparing' || normalized === 'dispatched' || normalized === 'paid';
    });
  }, [allOrders, statusFilter]);

  const counts = React.useMemo(() => {
    const delivered = allOrders.filter((order) => normalizeStatus(order.status) === 'delivered').length;
    const canceled = allOrders.filter((order) => normalizeStatus(order.status) === 'canceled').length;
    const active = allOrders.filter((order) => isActiveStatus(order.status)).length;
    return { all: allOrders.length, active, delivered, canceled };
  }, [allOrders]);

  const renderItem = ({ item }: ListRenderItemInfo<OrderDetail>) => (
    <OrderRow
      order={item}
      statusTone={getStatusTone(item.status)}
      onOpen={(id) => navigation.navigate('OrderDetail', { id })}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 28 }}
        ListHeaderComponent={
          <View style={[styles.headerWrap, { backgroundColor: isDark ? '#0f1714' : '#f2f6f2', borderColor: themeColors.border1 }]}>
            <AppText variant="title">Tus pedidos</AppText>
            <AppText style={styles.headerSubtitle}>Sigue el estado de cada cosecha confirmada y revisa sus detalles.</AppText>
            <View style={[styles.filtersWrap, { borderColor: themeColors.border1, backgroundColor: isDark ? '#151f1b' : '#e7eee9' }]}>
              <FilterChip
                label="Todos"
                count={counts.all}
                active={statusFilter === 'all'}
                onPress={() => setStatusFilter('all')}
              />
              <FilterChip
                label="Activas"
                count={counts.active}
                active={statusFilter === 'active'}
                onPress={() => setStatusFilter('active')}
              />
              <FilterChip
                label="Entregadas"
                count={counts.delivered}
                active={statusFilter === 'delivered'}
                onPress={() => setStatusFilter('delivered')}
              />
              <FilterChip
                label="Canceladas"
                count={counts.canceled}
                active={statusFilter === 'canceled'}
                onPress={() => setStatusFilter('canceled')}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <OrdersListLoadingSkeleton />
          ) : ordersQuery.isError ? (
            <Reveal delayMs={40}>
              <AppCard style={styles.stateCard}>
                <AppText variant="heading">No pudimos cargar tus pedidos</AppText>
                <AppText style={{ color: colors.text2 }}>Vuelve a intentarlo en unos segundos.</AppText>
                <AppButton title="Intentar de nuevo" tone="ghost" onPress={() => ordersQuery.refetch()} />
              </AppCard>
            </Reveal>
          ) : (
            <Reveal delayMs={40}>
              <AppCard style={styles.stateCard}>
                <AppText variant="heading">
                  {statusFilter === 'all' ? 'Aún no tienes pedidos' : 'No hay pedidos en este estado'}
                </AppText>
                <AppText style={{ color: colors.text2 }}>
                  {statusFilter === 'all'
                    ? 'Cuando confirmes tu primera compra, aparecerá aquí.'
                    : 'Prueba con otro filtro para revisar tus pedidos.'}
                </AppText>
                <AppButton
                  title="Ir a mi canasta"
                  tone="ghost"
                  onPress={() => navigation.getParent()?.navigate('CartTab' as never)}
                />
              </AppCard>
            </Reveal>
          )
        }
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function normalizeStatus(status: string | undefined): string {
  return (status ?? '').trim().toLowerCase();
}

function isActiveStatus(status: string | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized === 'created' || normalized === 'confirmed' || normalized === 'preparing' || normalized === 'dispatched' || normalized === 'paid';
}

function getStatusTone(status: string | undefined) {
  const normalized = normalizeStatus(status);
  if (normalized === 'delivered') {
    return { label: 'Entregado', bg: 'rgba(40,179,130,0.14)', border: 'rgba(40,179,130,0.45)', text: '#8fe2be' };
  }
  if (normalized === 'canceled') {
    return { label: 'Cancelado', bg: 'rgba(201,74,74,0.14)', border: 'rgba(201,74,74,0.45)', text: '#f0b5b5' };
  }
  return { label: 'Activo', bg: 'rgba(135,159,255,0.16)', border: 'rgba(135,159,255,0.45)', text: '#c8d2ff' };
}

function FilterChip({
  label,
  count,
  active,
  onPress
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText>
      <View style={[styles.filterCountBadge, active && styles.filterCountBadgeActive]}>
        <AppText style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14
  },
  headerSubtitle: {
    color: colors.text2,
    fontSize: 15,
    lineHeight: 20
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border1,
    borderRadius: 26,
    padding: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 118
  },
  filterChipActive: {
    backgroundColor: '#d6e2db',
    shadowColor: '#1a3328',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2
  },
  filterText: {
    color: colors.text2,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 96
  },
  filterTextActive: {
    color: '#1c2a23'
  },
  filterCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(28,42,35,0.12)'
  },
  filterCountText: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: '800'
  },
  filterCountTextActive: {
    color: '#1c2a23'
  },
  stateCard: {
    borderRadius: 16,
    gap: 8,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    marginTop: 10
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface2,
    padding: 12,
    shadowColor: '#0b1913',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3
  },
  orderId: {
    fontWeight: '800',
    fontSize: 16
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 4
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800'
  },
  orderMeta: {
    color: colors.text2,
    fontSize: 13,
    marginTop: 2
  },
  orderTotal: {
    fontWeight: '800',
    fontSize: 15,
    marginTop: 4
  }
});

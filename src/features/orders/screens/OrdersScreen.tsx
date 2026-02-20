import React from 'react';
import { FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../shared/ui/AppText';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppButton } from '../../../shared/ui/AppButton';
import { colors } from '../../../shared/theme/tokens';
import { OrderDetail, listOrders } from '../../../services/api/ordersApi';
import { OrdersFlowParamList } from '../types';

type Props = NativeStackScreenProps<OrdersFlowParamList, 'OrdersMain'>;

const OrderRow = React.memo(function OrderRow({
  order,
  onOpen
}: {
  order: OrderDetail;
  onOpen: (id: string) => void;
}) {
  return (
    <Pressable style={styles.orderRow} onPress={() => onOpen(order.id)}>
      <View style={{ flex: 1 }}>
        <AppText style={styles.orderId}>#{order.id}</AppText>
        <AppText style={styles.orderMeta}>Estado: {order.status}</AppText>
        {order.createdAt ? (
          <AppText style={styles.orderMeta}>{new Date(order.createdAt).toLocaleString('es-CO')}</AppText>
        ) : null}
      </View>
      <AppText style={styles.orderTotal}>${Number(order.total ?? order.subtotal ?? 0).toLocaleString('es-CO')}</AppText>
    </Pressable>
  );
});

export function OrdersScreen({ navigation }: Props) {
  const ordersQuery = useQuery({
    queryKey: ['orders-list', 1, 20],
    queryFn: () => listOrders(1, 20)
  });

  const orders = ordersQuery.data?.data ?? [];
  const renderItem = ({ item }: ListRenderItemInfo<OrderDetail>) => (
    <OrderRow order={item} onOpen={(id) => navigation.navigate('OrderDetail', { id })} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 28 }}
        ListHeaderComponent={<AppText variant="title">Mis órdenes</AppText>}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <View style={styles.skeletonWrap}>
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonLineLg} />
                <View style={styles.skeletonLineSm} />
              </View>
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonLineLg} />
                <View style={styles.skeletonLineSm} />
              </View>
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonLineLg} />
                <View style={styles.skeletonLineSm} />
              </View>
            </View>
          ) : ordersQuery.isError ? (
            <AppCard style={styles.stateCard}>
              <AppText variant="heading">No pudimos cargar tus órdenes</AppText>
              <AppText style={{ color: colors.text2 }}>Intenta nuevamente.</AppText>
              <AppButton title="Reintentar" tone="ghost" onPress={() => ordersQuery.refetch()} />
            </AppCard>
          ) : (
            <AppCard style={styles.stateCard}>
              <AppText variant="heading">Aún no tienes órdenes</AppText>
              <AppText style={{ color: colors.text2 }}>Crea tu primera orden desde checkout.</AppText>
              <AppButton
                title="Ir a carrito"
                tone="ghost"
                onPress={() => navigation.getParent()?.navigate('CartTab' as never)}
              />
            </AppCard>
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

const styles = StyleSheet.create({
  skeletonWrap: {
    gap: 10
  },
  skeletonRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface2,
    minHeight: 66,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8
  },
  skeletonLineLg: {
    height: 14,
    width: '56%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  skeletonLineSm: {
    height: 12,
    width: '34%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)'
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
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface2,
    padding: 12
  },
  orderId: {
    fontWeight: '800',
    fontSize: 16
  },
  orderMeta: {
    color: colors.text2,
    fontSize: 13,
    marginTop: 2
  },
  orderTotal: {
    fontWeight: '800',
    fontSize: 15
  }
});

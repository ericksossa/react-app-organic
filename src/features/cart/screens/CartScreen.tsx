import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Image, ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../shared/ui/AppText';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppIcon } from '../../../shared/ui/AppIcon';
import { useCartStore } from '../../../state/cartStore';
import { colors } from '../../../shared/theme/tokens';
import { CartItem } from '../types';
import { toCachedImageSource } from '../../../shared/utils/media';
import { useTheme } from '../../../shared/theme/useTheme';
import { brandMicrocopy } from '../../../shared/copy/brand-microcopy';
import { Reveal } from '../../../design/motion/Reveal';

type Props = NativeStackScreenProps<CartStackParamList, 'CartMain'>;

const QtyControl = React.memo(function QtyControl({
  value,
  onMinus,
  onPlus
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View style={styles.qtyControls}>
      <Pressable
        onPress={onMinus}
        style={[styles.qtyBtn, { borderColor: themeColors.border1, backgroundColor: isDark ? colors.surface1 : '#f1f4f1' }]}
      >
        <Text style={[styles.qtyBtnText, { color: themeColors.text1 }]}>-</Text>
      </Pressable>
      <Text style={[styles.qtyValue, { color: themeColors.text1 }]}>{value}</Text>
      <Pressable
        onPress={onPlus}
        style={[styles.qtyBtn, { borderColor: themeColors.border1, backgroundColor: isDark ? colors.surface1 : '#f1f4f1' }]}
      >
        <Text style={[styles.qtyBtnText, { color: themeColors.text1 }]}>+</Text>
      </Pressable>
    </View>
  );
});

const CartRow = React.memo(function CartRow({
  item,
  onDecrease,
  onIncrease,
  onRemove
}: {
  item: CartItem;
  onDecrease: (id: string, qty: number) => void;
  onIncrease: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View style={[styles.rowCard, { borderColor: themeColors.border1, backgroundColor: isDark ? colors.surface2 : '#f7f9f6' }]}>
      <View style={styles.rowTop}>
        {item.imageUrl ? (
          <Image source={toCachedImageSource(item.imageUrl)} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
        <View style={styles.rowMeta}>
          <AppText style={styles.rowTitle}>{item.name}</AppText>
          <AppText style={[styles.rowSub, { color: themeColors.text2 }]}>{item.variantName}</AppText>
          <AppText style={styles.rowPrice}>${item.unitPrice.toLocaleString('es-CO')}</AppText>
        </View>
      </View>

      <View style={styles.rowActions}>
        <QtyControl value={item.qty} onMinus={() => onDecrease(item.id, item.qty)} onPlus={() => onIncrease(item.id, item.qty)} />
        <Pressable
          onPress={() => onRemove(item.id)}
          style={[styles.removeBtn, { borderColor: themeColors.border1, backgroundColor: isDark ? colors.surface1 : '#f1f4f1' }]}
        >
          <AppIcon name="x-circle" color={themeColors.text2} size={16} />
        </Pressable>
      </View>
    </View>
  );
});

export function CartScreen({ navigation }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const snapshot = useCartStore((s) => s.snapshot);
  const load = useCartStore((s) => s.load);
  const updateItemQty = useCartStore((s) => s.updateItemQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const loading = useCartStore((s) => s.loading);
  const error = useCartStore((s) => s.error);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const items = snapshot?.items ?? [];
  const total = snapshot?.totals?.total ?? 0;

  const renderItem = ({ item }: ListRenderItemInfo<CartItem>) => (
    <CartRow
      item={item}
      onDecrease={(id, qty) => updateItemQty(id, qty - 1)}
      onIncrease={(id, qty) => updateItemQty(id, qty + 1)}
      onRemove={(id) => removeItem(id)}
    />
  );

  const listHeader = (
    <View style={styles.headerWrap}>
      {loading ? <AppText>Actualizando tu canasta...</AppText> : null}
      {error ? <AppText style={{ color: themeColors.danger }}>{error}</AppText> : null}
      {!loading && !error && items.length === 0 ? (
        <Reveal delayMs={40}>
          <AppCard
            style={[
              styles.emptyCard,
              { backgroundColor: isDark ? '#0f1815' : '#f4f6f3', borderColor: themeColors.border1 }
            ]}
          >
            <AppText variant="heading" style={styles.emptyTitle}>
              Tu canasta está vacía por ahora
            </AppText>
            <AppText style={[styles.emptySubtitle, { color: themeColors.text2 }]}>
              Explora el mercado y elige algo fresco para empezar.
            </AppText>
          </AppCard>
        </Reveal>
      ) : null}
    </View>
  );

  const listFooter = items.length > 0 && !loading ? (
    <View style={styles.footerWrap}>
      <View
        style={[
          styles.summaryCard,
          { borderColor: themeColors.border1, backgroundColor: isDark ? colors.surface1 : '#f4f7f4' }
        ]}
      >
        <View>
          <Text style={[styles.summaryLabel, { color: themeColors.text2 }]}>Subtotal ({items.length} productos)</Text>
          <Text style={[styles.summaryPrice, { color: themeColors.text1 }]}>
            ${Number(total).toLocaleString('es-CO')}
          </Text>
        </View>
        <AppButton title={brandMicrocopy.buttons.checkout} onPress={() => navigation.navigate('Checkout')} />
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.bg }]}>
      <View style={styles.topHeader}>
        <AppText style={styles.topHeaderTitle}>{brandMicrocopy.buttons.cart}</AppText>
      </View>
      <View style={[styles.topDivider, { backgroundColor: themeColors.border1 }]} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg
  },
  topHeader: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  topHeaderTitle: {
    fontSize: 33,
    lineHeight: 36,
    fontWeight: '800'
  },
  topDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12
  },
  headerWrap: {
    gap: 12
  },
  emptyCard: {
    borderRadius: 18,
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#0f1815',
    paddingVertical: 18
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700'
  },
  emptySubtitle: {
    color: colors.text2,
    textAlign: 'center'
  },
  rowCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface2,
    padding: 12,
    gap: 10
  },
  rowTop: {
    flexDirection: 'row',
    gap: 12
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border1
  },
  thumbFallback: {
    backgroundColor: colors.surface1
  },
  rowMeta: {
    flex: 1,
    gap: 4
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  rowSub: {
    color: colors.text2,
    fontSize: 13
  },
  rowPrice: {
    color: colors.text1,
    fontWeight: '700'
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border1
  },
  qtyBtnText: {
    color: colors.text1,
    fontSize: 16,
    fontWeight: '700'
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    color: colors.text1,
    fontWeight: '800'
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border1
  },
  footerWrap: {
    marginTop: 6
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surface1,
    padding: 14,
    gap: 10
  },
  summaryLabel: {
    color: colors.text2,
    fontSize: 13
  },
  summaryPrice: {
    color: colors.text1,
    fontWeight: '900',
    fontSize: 22
  }
});

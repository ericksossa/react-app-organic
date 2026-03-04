import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CatalogStackParamList } from '../../../app/navigation/types';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppText } from '../../../shared/ui/AppText';
import { AppIcon } from '../../../shared/ui/AppIcon';
import { ProductDetailLoadingSkeleton } from '../../../shared/ui/SkeletonPresets';
import { getProductBySlug } from '../../../services/api/catalogApi';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useCartStore } from '../../../state/cartStore';
import { colors } from '../../../shared/theme/tokens';
import { toCachedImageSource } from '../../../shared/utils/media';
import { useTheme } from '../../../shared/theme/useTheme';
import { brandMicrocopy } from '../../../shared/copy/brand-microcopy';

type Props = NativeStackScreenProps<CatalogStackParamList, 'ProductDetail'>;

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isVariantAvailable(variant: { inStock?: boolean | null; availableQty?: number | string | null } | undefined): boolean {
  if (!variant) return false;
  const qty = toFiniteNumber(variant.availableQty);
  if (typeof qty === 'number') return qty > 0;
  if (variant.inStock === true) return true;
  return false;
}

export function ProductDetailScreen({ route, navigation }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const addItem = useCartStore((s) => s.addItem);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [addToast, setAddToast] = React.useState<string | null>(null);
  const addToastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const productQuery = useQuery({
    queryKey: ['product-detail', route.params.slug, zoneId],
    queryFn: () => getProductBySlug(route.params.slug, zoneId ?? undefined)
  });

  const product = productQuery.data;
  const variants = product?.variants ?? [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const isSelectedVariantOutOfStock = !isVariantAvailable(selectedVariant);
  const isOutOfStock = product?.inStock === false || isSelectedVariantOutOfStock;

  React.useEffect(() => {
    if (!selectedVariantId && variants.length > 0) {
      setSelectedVariantId(variants[0].id);
    }
  }, [selectedVariantId, variants]);

  const showAddToast = React.useCallback((copy: string) => {
    if (addToastTimeoutRef.current) {
      clearTimeout(addToastTimeoutRef.current);
    }
    setAddToast(copy);
    addToastTimeoutRef.current = setTimeout(() => {
      setAddToast(null);
      addToastTimeoutRef.current = null;
    }, 2200);
  }, []);

  React.useEffect(() => {
    return () => {
      if (addToastTimeoutRef.current) {
        clearTimeout(addToastTimeoutRef.current);
        addToastTimeoutRef.current = null;
      }
    };
  }, []);

  const addMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!selectedVariant?.id) throw new Error('Selecciona una variante');
      if (isOutOfStock) throw new Error('out_of_stock');
      await addItem({ variantId: selectedVariant.id, qty: 1 });
      showAddToast(brandMicrocopy.confirmations.addedToBasket(product?.name ?? 'Producto'));
    },
    onError: () => {
      setError(isOutOfStock ? 'Este producto está sin stock por ahora.' : brandMicrocopy.errors.addToBasketFromDetail);
    }
  });

  const heroImage = product?.media?.[0]?.url;
  const heroBrand = (product?.brand ?? 'De origen local').toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.bg }]} edges={['top', 'bottom']}>
      {addToast ? (
        <View pointerEvents="none" style={styles.topToastOverlay}>
          <View
            style={[
              styles.topToastCard,
              {
                borderColor: isDark ? 'rgba(111,168,138,0.52)' : 'rgba(40,179,130,0.42)',
                backgroundColor: isDark ? 'rgba(11,28,21,0.96)' : 'rgba(231,246,239,0.97)'
              }
            ]}
          >
            <AppText style={{ color: isDark ? '#ddf3e8' : '#1f5a43', fontWeight: '700' }}>{addToast}</AppText>
          </View>
        </View>
      ) : null}
      {productQuery.isLoading ? (
        <View style={styles.stateWrap}>
          <AppText>Cargando detalles del producto...</AppText>
          <ProductDetailLoadingSkeleton />
        </View>
      ) : null}

      {productQuery.isError ? (
        <View style={styles.stateWrap}>
          <AppText style={{ color: themeColors.danger }}>No pudimos cargar este producto. Intenta de nuevo.</AppText>
        </View>
      ) : null}

      {product ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ImageBackground
              source={toCachedImageSource(heroImage)}
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <View style={[styles.heroOverlay, { backgroundColor: isDark ? 'rgba(6, 9, 8, 0.24)' : 'rgba(255,255,255,0.16)' }]} />

              <View style={styles.heroTopActions}>
                <Pressable style={styles.heroIconBtn} onPress={() => navigation.goBack()}>
                  <AppIcon name="back" color={isDark ? '#f3f7f5' : '#1f2421'} size={18} />
                </Pressable>
                <View style={styles.heroRightActions}>
                  <Pressable style={styles.heroIconBtn}>
                    <AppIcon name="bookmark" color={isDark ? '#f3f7f5' : '#1f2421'} size={18} />
                  </Pressable>
                  <Pressable style={styles.heroIconBtn}>
                    <AppIcon name="share" color={isDark ? '#f3f7f5' : '#1f2421'} size={18} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.heroContent}>
                <AppText style={[styles.heroEyebrow, { color: isDark ? 'rgba(241,246,243,0.86)' : '#2d3631' }]}>{heroBrand}</AppText>
                <AppText style={[styles.heroTitle, { color: isDark ? '#f4f7f5' : '#1d2320' }]}>{product.name}</AppText>
                <AppText style={[styles.heroMeta, { color: isDark ? '#ebf1ed' : '#2d3631' }]}>Orgánico de origen</AppText>
              </View>
            </ImageBackground>

            <View style={styles.variantsSection}>
              <AppText variant="heading">Elige tu presentación</AppText>

              {variants.map((variant) => {
                const selected = selectedVariant?.id === variant.id;
                const price = Number(variant.salePrice ?? variant.basePrice ?? 0);
                const variantInStock = isVariantAvailable(variant);
                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => setSelectedVariantId(variant.id)}
                    style={[
                      styles.variantRow,
                      {
                        borderColor: themeColors.border1,
                        backgroundColor: isDark ? '#0d1512' : '#f3f6f3'
                      },
                      selected &&
                        [
                          styles.variantRowActive,
                          {
                            borderColor: isDark ? 'rgba(72, 214, 155, 0.5)' : 'rgba(40,179,130,0.55)',
                            backgroundColor: isDark ? '#10211b' : '#ddf2e8'
                          }
                        ]
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.variantName}>{variant.name}</AppText>
                      <AppText style={[styles.variantMeta, { color: themeColors.text2 }]}>
                        COP{price.toLocaleString('es-CO')} · {variantInStock ? 'Disponible hoy' : 'Sin stock'}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        { borderColor: isDark ? 'rgba(72, 214, 155, 0.8)' : 'rgba(40,179,130,0.8)' },
                        selected && styles.radioActive
                      ]}
                    >
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.bottomBarWrap}>
            <View
              style={[
                styles.bottomBar,
                {
                  borderColor: themeColors.border1,
                  backgroundColor: isDark ? 'rgba(8,14,12,0.94)' : 'rgba(247,250,248,0.96)'
                }
              ]}
            >
              <View style={styles.quickActions}>
                <Pressable style={[styles.quickBtn, { borderColor: themeColors.border1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                  <AppIcon name="clock" color={themeColors.text1} size={14} />
                </Pressable>
                <Pressable style={[styles.quickBtn, { borderColor: themeColors.border1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                  <AppIcon name="bookmark" color={themeColors.text1} size={14} />
                </Pressable>
                <Pressable style={[styles.quickBtn, { borderColor: themeColors.border1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                  <AppIcon name="copy" color={themeColors.text1} size={14} />
                </Pressable>
              </View>

              <AppButton
                title={
                  addMutation.isPending
                    ? brandMicrocopy.buttons.addToBasketLoading
                    : brandMicrocopy.buttons.addToBasket
                }
                onPress={() => addMutation.mutate()}
                disabled={addMutation.isPending || !selectedVariant || isOutOfStock}
                style={styles.addCta}
              />
            </View>
            {error ? <AppText style={[styles.errorText, { color: themeColors.danger }]}>{error}</AppText> : null}
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040907'
  },
  stateWrap: {
    padding: 18,
    gap: 12
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 140,
    gap: 12
  },
  hero: {
    minHeight: 560,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'space-between'
  },
  heroImage: {
    borderRadius: 26
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 9, 8, 0.24)'
  },
  heroTopActions: {
    marginTop: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  heroRightActions: {
    flexDirection: 'row',
    gap: 10
  },
  heroIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 8
  },
  heroEyebrow: {
    color: 'rgba(241,246,243,0.86)',
    letterSpacing: 1.8,
    fontSize: 12,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: '#f4f7f5',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    maxWidth: '72%'
  },
  heroMeta: {
    color: '#ebf1ed',
    fontSize: 13
  },
  variantsSection: {
    gap: 10,
    paddingTop: 4
  },
  variantRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: '#0d1512',
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  variantRowActive: {
    borderColor: 'rgba(72, 214, 155, 0.5)',
    backgroundColor: '#10211b'
  },
  variantName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700'
  },
  variantMeta: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 2
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(72, 214, 155, 0.8)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioActive: {
    backgroundColor: 'rgba(72, 214, 155, 0.08)'
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#48d69b'
  },
  bottomBarWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 8,
    gap: 6
  },
  bottomBar: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8,14,12,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  quickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addCta: {
    flex: 1,
    borderRadius: 14,
    minHeight: 42
  },
  errorText: {
    color: colors.danger,
    fontSize: 12
  },
  topToastOverlay: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    zIndex: 30
  },
  topToastCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});

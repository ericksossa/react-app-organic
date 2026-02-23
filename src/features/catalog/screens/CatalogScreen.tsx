import React from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  ListRenderItemInfo,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CatalogStackParamList } from '../../../app/navigation/types';
import { CatalogProduct, getCatalog, getCategories, getProductBySlug } from '../../../services/api/catalogApi';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppIcon } from '../../../shared/ui/AppIcon';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useCartStore } from '../../../state/cartStore';
import { colors } from '../../../shared/theme/tokens';
import { listDeliveryZones } from '../../../services/api/availabilityApi';
import { toCachedImageSource } from '../../../shared/utils/media';
import { useTheme } from '../../../shared/theme/useTheme';
import { getItem, setItem } from '../../../services/storage/kvStorage';
import { storageKeys } from '../../../config/storageKeys';
import { brandMicrocopy, getZoneDeliveryMicrocopy } from '../../../shared/copy/brand-microcopy';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  SharedValue,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';
import { motionDuration, motionEasings } from '../../../design/motion/tokens';
import { Reveal } from '../../../design/motion/Reveal';

type Props = NativeStackScreenProps<CatalogStackParamList, 'CatalogMain'>;
const ZONE_SHEET_ANIM_MS = 280;
const CATALOG_HEADER_SNAP_Y = 108;
const CATALOG_HEADER_SNAP_THRESHOLD = 60;
const IS_ANDROID = Platform.OS === 'android';
const CATALOG_CARD_SHADOW_OPACITY = IS_ANDROID ? 0.12 : 0.2;
const CATALOG_CARD_SHADOW_RADIUS = IS_ANDROID ? 9 : 14;
const CATALOG_CARD_ELEVATION = IS_ANDROID ? 5 : 8;
const CATALOG_SNAP_OVERSHOOT_TOP = IS_ANDROID ? 11 : 16;
const CATALOG_SNAP_OVERSHOOT_HEADER = IS_ANDROID ? 8 : 12;
const CATALOG_SNAP_SETTLE_MS = IS_ANDROID ? 90 : 120;
const HOME_SEARCH_HISTORY_LIMIT = 6;

type HomeSearchMemory = {
  lastQuery: string;
  recentSuggestions: string[];
};

const CATEGORY_EMOJI: Record<string, string> = {
  all: '✨',
  frutas: '🍓',
  fruta: '🍓',
  verduras: '🥬',
  vegetal: '🥬',
  vegetales: '🥬',
  hortalizas: '🥕',
  lacteos: '🥛',
  lacteo: '🥛',
  panaderia: '🥖',
  panadería: '🥖',
  cereales: '🌾',
  granos: '🌾',
  legumbres: '🫘',
  semillas: '🌻',
  carnes: '🥩',
  carne: '🥩',
  pollo: '🍗',
  pescado: '🐟',
  mariscos: '🦐',
  bebidas: '🥤',
  infusiones: '🌱',
  aromatica: '🌱',
  aromática: '🌱',
  especias: '🧂',
  miel: '🍯',
  snacks: '🥜',
  desayuno: '🥣',
  congelados: '🧊'
};

function getCategoryEmoji(name: string, slug?: string): string {
  const normalizedSlug = slug?.trim().toLowerCase();
  if (normalizedSlug && CATEGORY_EMOJI[normalizedSlug]) return CATEGORY_EMOJI[normalizedSlug];

  const normalizedName = name.trim().toLowerCase();
  const entry = Object.entries(CATEGORY_EMOJI).find(([key]) => normalizedName.includes(key));
  return entry?.[1] ?? '🧺';
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const CatalogRow = React.memo(function CatalogRow({
  item,
  index,
  onOpen,
  onAdd,
  adding,
  highlighted,
  scrollY
}: {
  item: CatalogProduct;
  index: number;
  onOpen: (slug: string) => void;
  onAdd: (product: CatalogProduct) => void;
  adding: boolean;
  highlighted: boolean;
  scrollY: SharedValue<number>;
}) {
  const { colors: themeColors, isDark } = useTheme();
  const reduceMotion = useReducedMotionSetting();
  const isAvailable = index % 4 !== 0;
  const imagePressProgress = useSharedValue(0);
  const addFeedbackProgress = useSharedValue(0);

  React.useEffect(() => {
    if (!adding || reduceMotion) return;

    addFeedbackProgress.value = withSequence(
      withTiming(1, { duration: motionDuration('micro', reduceMotion), easing: motionEasings.enter }),
      withTiming(0, { duration: motionDuration('short', reduceMotion), easing: motionEasings.organic })
    );
  }, [addFeedbackProgress, adding, reduceMotion]);
  const rowScrollStyle = useAnimatedStyle(() => {
    const rowIndex = Math.floor(index / 2);
    const revealStart = rowIndex * 56;
    const revealEnd = revealStart + 260;
    const lateralShift = index % 2 === 0 ? -3 : 3;
    const depthStrength = interpolate(
      scrollY.value,
      [0, revealStart, revealEnd],
      [1, 1, 0.58],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, revealStart, revealEnd],
            reduceMotion ? [0, 0, 0] : [0, 0, -8],
            Extrapolation.CLAMP
          )
        },
        {
          scale: interpolate(
            scrollY.value,
            [0, revealStart, revealEnd],
            reduceMotion ? [1, 1, 1] : [1, 1, 0.987],
            Extrapolation.CLAMP
          )
        },
        {
          translateX: interpolate(
            scrollY.value,
            [0, revealStart, revealEnd],
            reduceMotion ? [0, 0, 0] : [0, 0, lateralShift],
            Extrapolation.CLAMP
          )
        }
      ],
      opacity: interpolate(
        scrollY.value,
        [0, revealStart, revealEnd],
        [1, 1, 0.93],
        Extrapolation.CLAMP
      ),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: CATALOG_CARD_SHADOW_RADIUS,
      shadowOpacity: CATALOG_CARD_SHADOW_OPACITY * depthStrength,
      elevation: CATALOG_CARD_ELEVATION * depthStrength
    };
  }, [index, reduceMotion, scrollY]);
  const imageZoomStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          imagePressProgress.value,
          [0, 1],
          reduceMotion ? [1, 1] : [1.045, 1.095],
          Extrapolation.CLAMP
        )
      }
    ]
  }), [reduceMotion]);
  const addFeedbackStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [{ scale: interpolate(addFeedbackProgress.value, [0, 1], [1, 1.015], Extrapolation.CLAMP) }]
  }), [reduceMotion]);

  return (
    <Animated.View
      entering={FadeInDown.delay((index % 8) * 46).duration(320)}
      style={styles.productCell}
    >
      <Animated.View style={addFeedbackStyle}>
        <Animated.View
          style={[
            styles.productCard,
            {
              borderColor: highlighted
                ? isDark
                  ? 'rgba(111,168,138,0.72)'
                  : 'rgba(40,179,130,0.72)'
                : themeColors.border1,
              backgroundColor: highlighted
                ? isDark
                  ? 'rgba(16,38,30,0.94)'
                  : '#e7f6ef'
                : isDark
                  ? '#0f1512'
                  : '#f5f7f4'
            },
            highlighted && styles.productCardHighlighted,
            rowScrollStyle
          ]}
        >
        <Pressable
          onPress={() => onOpen(item.slug)}
          onPressIn={() => {
            imagePressProgress.value = withTiming(1, {
              duration: motionDuration('short', reduceMotion),
              easing: motionEasings.organic
            });
          }}
          onPressOut={() => {
            imagePressProgress.value = withTiming(0, {
              duration: motionDuration('short', reduceMotion),
              easing: motionEasings.organic
            });
          }}
        >
          <View style={styles.productImageViewport}>
            <Animated.View style={[styles.productImageZoomWrap, imageZoomStyle]}>
              {item.imageUrl ? (
                <Image source={toCachedImageSource(item.imageUrl)} style={styles.productImage} resizeMode="cover" />
              ) : (
                <View style={styles.imageFallback} />
              )}
            </Animated.View>
          </View>
          <View style={styles.productMeta}>
            <AppText style={[styles.productName, { color: themeColors.text1 }]} numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText style={[styles.productPrice, { color: themeColors.text1 }]}>
              COP{Number(item.priceFrom ?? 0).toLocaleString('es-CO')}
            </AppText>
            <View
              style={[
                styles.stockPill,
                isAvailable
                  ? [styles.stockPillOk, !isDark && { borderColor: 'rgba(40,179,130,0.55)', backgroundColor: 'rgba(40,179,130,0.14)' }]
                  : [styles.stockPillOut, !isDark && { borderColor: 'rgba(184,72,72,0.55)', backgroundColor: 'rgba(184,72,72,0.12)' }]
              ]}
            >
              <View style={styles.stockInline}>
                <AppIcon name={isAvailable ? 'check-circle' : 'x-circle'} color={isAvailable ? (isDark ? '#cfe7d9' : '#1c5a44') : (isDark ? '#f0c0c0' : '#7d3030')} size={13} />
                <AppText style={isAvailable ? [styles.stockTextOk, !isDark && { color: '#1c5a44' }] : [styles.stockTextOut, !isDark && { color: '#7d3030' }]}>
                  {isAvailable ? 'Disponible' : 'Se agotó por hoy'}
                </AppText>
              </View>
            </View>
          </View>
        </Pressable>
        <AppButton
          title={adding ? brandMicrocopy.buttons.addToBasketLoading : brandMicrocopy.buttons.addToBasket}
          onPress={() => onAdd(item)}
          disabled={adding}
          style={styles.cardAddButton}
          titleStyle={styles.cardAddButtonText}
          titleNumberOfLines={2}
        />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

export function CatalogScreen({ navigation, route }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const reduceMotion = useReducedMotionSetting();
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const selectedZone = useAvailabilityStore((s) => s.selectedZone);
  const selectZone = useAvailabilityStore((s) => s.selectZone);
  const addItem = useCartStore((s) => s.addItem);
  const [query, setQuery] = React.useState(route.params?.initialQuery ?? '');
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>(undefined);
  const [zonePickerOpen, setZonePickerOpen] = React.useState(false);
  const [addingProductId, setAddingProductId] = React.useState<string | null>(null);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = React.useState<string | null>(null);
  const zoneSheetProgress = useSharedValue(0);
  const searchFocusProgress = useSharedValue(0);
  const catalogScrollY = useSharedValue(0);
  const listRef = React.useRef<FlatList<CatalogProduct> | null>(null);
  const lastHeaderSnapTargetRef = React.useRef<number | null>(null);
  const catalogSnapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const zonesQuery = useQuery({
    queryKey: ['delivery-zones-catalog'],
    queryFn: () => listDeliveryZones()
  });

  const zones = React.useMemo(
    () => (zonesQuery.data ?? []).filter((zone) => zone.isActive !== false),
    [zonesQuery.data]
  );

  React.useEffect(() => {
    if (!zones.length) return;

    if (zoneId) {
      const current = zones.find((zone) => zone.id === zoneId);
      if (current) {
        void selectZone({ id: current.id, name: current.name, city: current.city });
        return;
      }
    }

    const fallback = zones[0];
    if (fallback) {
      void selectZone({ id: fallback.id, name: fallback.name, city: fallback.city });
    }
  }, [zones, zoneId, selectZone]);

  const categoriesQuery = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: getCategories
  });

  const catalogQuery = useQuery({
    queryKey: ['catalog', zoneId, query, categorySlug],
    queryFn: () =>
      getCatalog({
        page: 1,
        limit: 40,
        zoneId: zoneId ?? undefined,
        q: query.trim() || undefined,
        categorySlug
      })
  });

  const products = catalogQuery.data?.data ?? [];
  const featured = products[0];
  const listData = featured ? products.slice(1) : products;
  const chips = [{ id: 'all', name: 'Todo', slug: undefined }, ...(categoriesQuery.data ?? [])];
  const routeInitialQuery = route.params?.initialQuery;
  const routeInitialCategorySlug = route.params?.initialCategorySlug;
  const routeInitialProductSlug = route.params?.initialProductSlug;
  const lastAppliedRouteSeedRef = React.useRef('');

  const handleAddFromCatalog = React.useCallback(
    async (product: CatalogProduct) => {
      setAddError(null);
      setAddingProductId(product.id);

      try {
        let variantId = product.defaultVariantId;
        if (!variantId) {
          const detail = await getProductBySlug(product.slug, zoneId ?? undefined);
          variantId = detail?.variants?.[0]?.id;
        }

        if (!variantId) {
          throw new Error('missing_variant');
        }

        await addItem({ variantId, qty: 1 });
      } catch {
        setAddError(brandMicrocopy.errors.addToBasketFromCatalog);
      } finally {
        setAddingProductId(null);
      }
    },
    [addItem, zoneId]
  );

  React.useEffect(() => {
    const toPrefetch = products
      .slice(0, 8)
      .map((item) => item.imageUrl)
      .filter((url): url is string => Boolean(url));
    toPrefetch.forEach((url) => {
      void Image.prefetch(url);
    });
  }, [products]);

  React.useEffect(() => {
    const seed = `${routeInitialQuery ?? ''}|${routeInitialCategorySlug ?? ''}|${routeInitialProductSlug ?? ''}`;
    if (seed === '||') return;
    if (lastAppliedRouteSeedRef.current === seed) return;

    lastAppliedRouteSeedRef.current = seed;

    if (routeInitialCategorySlug) {
      setCategorySlug(routeInitialCategorySlug);
      setQuery('');
      setHighlightedProductId(null);
    } else if (routeInitialQuery?.trim()) {
      setQuery(routeInitialQuery.trim());
    }

    if (routeInitialProductSlug) {
      setCategorySlug(undefined);
      setHighlightedProductId(routeInitialProductSlug);
      setQuery(routeInitialProductSlug);
    }

    navigation.setParams({
      initialQuery: undefined,
      initialCategorySlug: undefined,
      initialProductSlug: undefined
    });
  }, [navigation, routeInitialCategorySlug, routeInitialProductSlug, routeInitialQuery]);

  React.useEffect(() => {
    const sourceSearch = (routeInitialQuery?.trim() || query.trim());
    if (!sourceSearch || !categoriesQuery.data?.length) return;

    const normalized = normalizeSearchText(sourceSearch);
    const match = categoriesQuery.data.find((category) => {
      const normalizedName = normalizeSearchText(category.name);
      const normalizedSlug = normalizeSearchText(category.slug);
      return (
        normalized === normalizedName ||
        normalized === normalizedSlug
      );
    });

    if (!match) return;
    if (categorySlug !== match.slug) {
      setCategorySlug(match.slug);
    }
    if (query.trim()) setQuery('');
  }, [categoriesQuery.data, categorySlug, query, routeInitialQuery]);

  React.useEffect(() => {
    const sourceSearch = (routeInitialQuery?.trim() || query.trim());
    if (!sourceSearch || !products.length || categorySlug) {
      setHighlightedProductId(null);
      return;
    }

    const normalized = normalizeSearchText(sourceSearch);
    const productMatch =
      products.find((product) => normalizeSearchText(product.slug) === normalized) ??
      products.find((product) => normalizeSearchText(product.name) === normalized) ??
      products.find((product) => normalizeSearchText(product.name).includes(normalized));

    setHighlightedProductId(productMatch?.id ?? null);
  }, [categorySlug, products, query, routeInitialQuery]);

  React.useEffect(() => {
    const normalized = query.trim();
    if (!normalized) return;

    const syncSearchMemory = async () => {
      const memory = await getItem<HomeSearchMemory>(storageKeys.homeSearchMemory);
      const existing = Array.isArray(memory?.recentSuggestions)
        ? memory.recentSuggestions
        : [];
      const deduped = [normalized, ...existing.filter((item) => item !== normalized)].slice(
        0,
        HOME_SEARCH_HISTORY_LIMIT
      );

      await setItem<HomeSearchMemory>(storageKeys.homeSearchMemory, {
        lastQuery: normalized,
        recentSuggestions: deduped
      });
    };

    void syncSearchMemory();
  }, [query]);

  React.useEffect(() => {
    const isActive =
      isSearchFocused ||
      query.trim().length > 0 ||
      Boolean(categorySlug) ||
      Boolean(highlightedProductId);
    searchFocusProgress.value = withTiming(isActive ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic)
    });
  }, [categorySlug, highlightedProductId, isSearchFocused, query, searchFocusProgress]);

  const openZonePicker = React.useCallback(() => {
    setZonePickerOpen(true);
    zoneSheetProgress.value = 0;
    zoneSheetProgress.value = withTiming(1, {
      duration: ZONE_SHEET_ANIM_MS,
      easing: Easing.out(Easing.cubic)
    });
  }, [zoneSheetProgress]);

  const closeZonePicker = React.useCallback(() => {
    zoneSheetProgress.value = withTiming(
      0,
      {
        duration: ZONE_SHEET_ANIM_MS - 40,
        easing: Easing.inOut(Easing.cubic)
      },
      (finished) => {
        if (finished) runOnJS(setZonePickerOpen)(false);
      }
    );
  }, [zoneSheetProgress]);

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zoneSheetProgress.value, [0, 1], [0, 1])
  }));

  const sheetAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zoneSheetProgress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(zoneSheetProgress.value, [0, 1], [36, 0]) },
      { scale: interpolate(zoneSheetProgress.value, [0, 1], [0.97, 1]) }
    ]
  }));

  const searchCardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(searchFocusProgress.value, [0, 1], [1, 1.015]) }],
    opacity: interpolate(searchFocusProgress.value, [0, 1], [0.96, 1])
  }));

  const searchGlowAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocusProgress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(searchFocusProgress.value, [0, 1], [0.92, 1]) }]
  }));

  const searchIconAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(searchFocusProgress.value, [0, 1], [1, 1.08]) },
      { translateX: interpolate(searchFocusProgress.value, [0, 1], [0, 1]) }
    ]
  }));

  const clearActionAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocusProgress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(searchFocusProgress.value, [0, 1], [0.9, 1]) }]
  }));

  const zoneTriggerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(zoneSheetProgress.value, [0, 1], [1, 1.015]) }],
    opacity: interpolate(zoneSheetProgress.value, [0, 1], [1, 0.98])
  }));

  const zoneBadgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(zoneSheetProgress.value, [0, 1], [1, 1.06]) }],
    opacity: interpolate(zoneSheetProgress.value, [0, 1], [0.9, 1])
  }));

  const zoneChevronAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(zoneSheetProgress.value, [0, 1], [0, 180])}deg` },
      { scale: interpolate(zoneSheetProgress.value, [0, 1], [1, 1.06]) }
    ]
  }));

  const onCatalogScroll = useAnimatedScrollHandler((event) => {
    catalogScrollY.value = event.contentOffset.y;
  });

  const maybeSnapCatalogHeader = React.useCallback((y: number) => {
    if (y <= 0 || y >= CATALOG_HEADER_SNAP_Y) {
      lastHeaderSnapTargetRef.current = null;
      return;
    }

    const target = y < CATALOG_HEADER_SNAP_THRESHOLD ? 0 : CATALOG_HEADER_SNAP_Y;
    if (Math.abs(y - target) < 2) {
      lastHeaderSnapTargetRef.current = null;
      return;
    }

    if (lastHeaderSnapTargetRef.current === target) return;
    lastHeaderSnapTargetRef.current = target;

    if (catalogSnapTimeoutRef.current) clearTimeout(catalogSnapTimeoutRef.current);

    const overshoot =
      target === 0 ? CATALOG_SNAP_OVERSHOOT_TOP : target + CATALOG_SNAP_OVERSHOOT_HEADER;
    listRef.current?.scrollToOffset({ offset: overshoot, animated: true });
    catalogSnapTimeoutRef.current = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: target, animated: true });
      lastHeaderSnapTargetRef.current = null;
      catalogSnapTimeoutRef.current = null;
    }, CATALOG_SNAP_SETTLE_MS);
  }, []);

  const onCatalogScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      maybeSnapCatalogHeader(event.nativeEvent.contentOffset.y);
    },
    [maybeSnapCatalogHeader]
  );

  React.useEffect(
    () => () => {
      if (catalogSnapTimeoutRef.current) clearTimeout(catalogSnapTimeoutRef.current);
    },
    []
  );

  const zoneCardScrollStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(catalogScrollY.value, [0, 180], [0, -6], Extrapolation.CLAMP)
      }
    ],
    opacity: interpolate(catalogScrollY.value, [0, 220], [1, 0.95], Extrapolation.CLAMP)
  }));

  const searchCardScrollStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(catalogScrollY.value, [0, 220], [0, -8], Extrapolation.CLAMP)
      },
      {
        scale: interpolate(catalogScrollY.value, [0, 260], [1, 0.992], Extrapolation.CLAMP)
      }
    ]
  }));

  const chipsScrollStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(catalogScrollY.value, [0, 220], [0, -4], Extrapolation.CLAMP)
      }
    ],
    opacity: interpolate(catalogScrollY.value, [0, 300], [1, 0.94], Extrapolation.CLAMP)
  }));

  const clearCatalogFilters = React.useCallback(() => {
    setQuery('');
    setCategorySlug(undefined);
    setHighlightedProductId(null);
    navigation.setParams({
      initialQuery: undefined,
      initialCategorySlug: undefined,
      initialProductSlug: undefined
    });
  }, [navigation]);

  const listHeader = (
    <View style={{ gap: 16 }}>
      <Animated.View style={zoneCardScrollStyle}>
        <AppCard style={[styles.zoneCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]}>
        <Animated.View style={zoneTriggerAnimStyle}>
          <Pressable
            style={[
              styles.zoneTrigger,
              {
                borderColor: isDark ? 'rgba(111,168,138,0.45)' : 'rgba(40,179,130,0.35)',
                backgroundColor: isDark ? '#10251d' : '#dcf4e9'
              }
            ]}
            onPress={openZonePicker}
          >
            <Animated.View
              style={[
                styles.zoneBadge,
                { backgroundColor: isDark ? 'rgba(111,168,138,0.2)' : 'rgba(40,179,130,0.18)' },
                zoneBadgeAnimStyle
              ]}
            >
              <AppText style={[styles.zoneBadgeText, { color: isDark ? '#d3ebdc' : '#1f6a4e' }]}>Zona de entrega</AppText>
            </Animated.View>
            <AppText style={[styles.zoneText, { color: themeColors.text1 }]}>
              {getZoneDeliveryMicrocopy(selectedZone?.name)}
            </AppText>
            <Animated.View style={zoneChevronAnimStyle}>
              <View style={[styles.zoneChevronWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
                <AppIcon name="chevron-down" color={themeColors.text2} size={14} />
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
        </AppCard>
      </Animated.View>

      <Animated.View style={[searchCardAnimStyle, searchCardScrollStyle]}>
        <AppCard
          style={[
            styles.searchCard,
            {
              backgroundColor: isDark ? '#101a15' : '#f1f6f2',
              borderColor:
                isSearchFocused || query.trim().length > 0
                  ? isDark
                    ? 'rgba(111,168,138,0.55)'
                    : 'rgba(40,179,130,0.5)'
                  : themeColors.border1
            }
          ]}
        >
          <Animated.View
            style={[
              styles.searchGlow,
              {
                backgroundColor: isDark
                  ? 'rgba(40,179,130,0.13)'
                  : 'rgba(40,179,130,0.12)'
              },
              searchGlowAnimStyle
            ]}
          />
          <Animated.View style={[styles.searchIconWrap, searchIconAnimStyle]}>
            <View
              style={[
                styles.searchIcon,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)'
                }
              ]}
            >
              <AppIcon
                name="search"
                color={
                  isSearchFocused || query.trim().length > 0
                    ? isDark
                      ? '#cde7d9'
                      : '#1e7253'
                    : themeColors.text2
                }
                size={16}
              />
            </View>
          </Animated.View>
          <TextInput
            placeholder="Busca frutas, verduras o productores"
            placeholderTextColor={themeColors.text2}
            style={[styles.searchInput, { color: themeColors.text1 }]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            selectionColor={isDark ? '#7bc7a2' : '#1f8d63'}
          />
          {query.trim().length > 0 || Boolean(categorySlug) || Boolean(highlightedProductId) ? (
            <Animated.View style={clearActionAnimStyle}>
              <Pressable
                onPress={clearCatalogFilters}
                style={[
                  styles.clearSearchAction,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.06)'
                  }
                ]}
              >
                <AppIcon
                  name="x-circle"
                  color={isDark ? '#dbe8df' : '#33594a'}
                  size={16}
                />
              </Pressable>
            </Animated.View>
          ) : null}
        </AppCard>
      </Animated.View>

      <Animated.View style={chipsScrollStyle}>
        <FlatList
        horizontal
        data={chips}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const isActive = item.slug ? categorySlug === item.slug : !categorySlug;
          return (
            <Pressable
              style={[
                styles.chip,
                { borderColor: themeColors.border1, backgroundColor: isDark ? '#0a100d' : '#f1f3f0' },
                isActive && [styles.chipActive, { borderColor: isDark ? 'rgba(111,168,138,0.45)' : 'rgba(40,179,130,0.45)', backgroundColor: isDark ? '#103126' : '#d7eee4' }]
              ]}
              onPress={() => {
                setCategorySlug(item.slug ?? undefined);
                setQuery('');
                setHighlightedProductId(null);
              }}
            >
              <AppText style={[isActive ? styles.chipTextActive : styles.chipText, { color: isActive ? themeColors.text1 : themeColors.text2 }]}>
                {`${getCategoryEmoji(item.name, item.slug)} ${item.name}`}
              </AppText>
            </Pressable>
          );
        }}
        />
      </Animated.View>

      <View style={[styles.filtersDivider, { backgroundColor: themeColors.border1 }]} />

      {catalogQuery.isLoading ? <AppText>Cargando productos frescos...</AppText> : null}
      {catalogQuery.isError ? <AppText style={{ color: themeColors.danger }}>No pudimos abrir el mercado. Intenta de nuevo.</AppText> : null}
      {addError ? <AppText style={{ color: themeColors.danger }}>{addError}</AppText> : null}

      {featured ? (
        <ImageBackground
          source={toCachedImageSource(featured.imageUrl)}
          style={styles.featuredCard}
          imageStyle={[styles.featuredImage, !reduceMotion && styles.featuredImageZoom]}
        >
          <View style={[styles.featuredOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)' }]} />
          <View style={styles.featuredContent}>
            <AppText style={styles.featuredEyebrow}>Selección de hoy</AppText>
            <AppText style={styles.featuredName}>{featured.name}</AppText>
            <AppButton
              title={
                addingProductId === featured.id
                  ? brandMicrocopy.buttons.addToBasketLoading
                  : brandMicrocopy.buttons.addToBasket
              }
              onPress={() => void handleAddFromCatalog(featured)}
              disabled={addingProductId === featured.id}
              style={styles.addButton}
              titleStyle={styles.addButtonText}
              titleNumberOfLines={1}
            />
          </View>
        </ImageBackground>
      ) : null}

      {!catalogQuery.isLoading && !catalogQuery.isError && products.length === 0 ? (
        <Reveal delayMs={40}>
          <AppCard style={{ backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }}>
            <AppText>{brandMicrocopy.states.noProductsAvailable}</AppText>
          </AppCard>
        </Reveal>
      ) : null}
    </View>
  );

  const renderItem = ({ item, index }: ListRenderItemInfo<CatalogProduct>) => (
    <CatalogRow
      item={item}
      index={index}
      onOpen={(slug) => navigation.navigate('ProductDetail', { slug })}
      onAdd={(product) => {
        void handleAddFromCatalog(product);
      }}
      adding={addingProductId === item.id}
      highlighted={highlightedProductId === item.id}
      scrollY={catalogScrollY}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <Animated.FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ padding: 14, gap: 14 }}
        columnWrapperStyle={styles.productsColumn}
        ListHeaderComponent={listHeader}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
        onScroll={onCatalogScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={onCatalogScrollEnd}
        onMomentumScrollEnd={onCatalogScrollEnd}
      />

      <Modal visible={zonePickerOpen} transparent animationType="none" onRequestClose={closeZonePicker}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeZonePicker}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                { backgroundColor: isDark ? 'rgba(2,8,5,0.72)' : 'rgba(6,28,20,0.35)' },
                backdropAnimStyle
              ]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#0e1713' : '#f4fbf7',
                borderColor: isDark ? 'rgba(111,168,138,0.35)' : 'rgba(40,179,130,0.26)'
              },
              sheetAnimStyle
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)' }]} />
            <AppText variant="heading">Elige tu zona de entrega</AppText>
            <AppText style={{ color: themeColors.text2 }}>
              Ajustamos el mercado y los tiempos de entrega según tu ubicación.
            </AppText>

            <View style={styles.zoneOptions}>
              {zones.map((zone, index) => {
                const isSelected = zone.id === zoneId;
                return (
                  <Animated.View
                    key={zone.id}
                    entering={reduceMotion ? undefined : FadeInDown.delay(index * 36).duration(280)}
                  >
                    <Pressable
                      onPress={() => {
                        void selectZone({ id: zone.id, name: zone.name, city: zone.city });
                        closeZonePicker();
                      }}
                      style={[
                        styles.zoneOptionPremium,
                        {
                          borderColor: isSelected
                            ? isDark
                              ? 'rgba(111,168,138,0.6)'
                              : 'rgba(40,179,130,0.55)'
                            : themeColors.border1,
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(111,168,138,0.16)'
                              : 'rgba(40,179,130,0.12)'
                            : isDark
                              ? '#121d18'
                              : '#ffffff'
                        }
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.zoneOptionTitle}>
                          {zone.city ? `${zone.city} / ` : ''}
                          {zone.name}
                        </AppText>
                        <AppText style={{ color: themeColors.text2, fontSize: 12 }}>
                          Llega a tu puerta en 30 - 60 min
                        </AppText>
                      </View>
                      {isSelected ? (
                        <AppIcon
                          name="check-circle"
                          color={isDark ? '#9be2c0' : '#1a7a56'}
                          size={18}
                        />
                      ) : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
            <AppButton title="Listo" tone="ghost" onPress={closeZonePicker} />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  zoneCard: {
    borderRadius: 18,
    backgroundColor: colors.surface1
  },
  zoneTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: '#121815',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10
  },
  zoneBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  zoneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  zoneLabel: {
    color: colors.text2,
    fontSize: 12
  },
  zoneText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600'
  },
  zoneChevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoneOptions: {
    gap: 8
  },
  zoneOptionPremium: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  zoneOptionTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalCard: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border1,
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingTop: 10,
    gap: 12
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999
  },
  searchCard: {
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#111714',
    overflow: 'hidden'
  },
  searchGlow: {
    ...StyleSheet.absoluteFillObject
  },
  searchIconWrap: {
    marginLeft: 2
  },
  searchIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchInput: {
    flex: 1,
    color: colors.text1,
    fontSize: 15,
    marginLeft: 8
  },
  clearSearchAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chips: {
    flexDirection: 'row',
    gap: 8
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: '#0a100d'
  },
  chipActive: {
    backgroundColor: '#103126',
    borderColor: 'rgba(111,168,138,0.45)'
  },
  chipText: {
    color: colors.text2,
    fontSize: 13
  },
  chipTextActive: {
    color: colors.text1,
    fontSize: 13
  },
  featuredCard: {
    overflow: 'hidden',
    minHeight: 320,
    borderRadius: 22,
    marginTop: 2
  },
  featuredImage: {
    borderRadius: 22
  },
  featuredImageZoom: {
    transform: [{ scale: 1.05 }]
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)'
  },
  featuredContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    gap: 8
  },
  featuredEyebrow: {
    color: '#d2e7d9',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12
  },
  featuredName: {
    fontSize: 33,
    lineHeight: 36,
    fontWeight: '700'
  },
  addButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    minHeight: 40,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(232, 246, 238, 0.92)',
    shadowColor: '#0f2d22',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4
  },
  addButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  productCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: '#0f1512',
    overflow: 'hidden'
  },
  productCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0
  },
  productsColumn: {
    gap: 10,
    alignItems: 'flex-start'
  },
  productCardHighlighted: {
    shadowColor: '#28b382',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface2
  },
  productImageViewport: {
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  productImageZoomWrap: {
    width: '100%'
  },
  imageFallback: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface2
  },
  productMeta: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 5
  },
  cardAddButton: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 14,
    minHeight: 40,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(221, 242, 232, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(40, 179, 130, 0.22)',
    shadowColor: '#0d271d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3
  },
  cardAddButtonText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.15
  },
  productPrice: {
    fontWeight: '700',
    fontSize: 14
  },
  productName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700'
  },
  stockPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1
  },
  stockInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  stockPillOk: {
    borderColor: 'rgba(111,168,138,0.55)',
    backgroundColor: 'rgba(66,117,91,0.24)'
  },
  stockPillOut: {
    borderColor: 'rgba(201,74,74,0.55)',
    backgroundColor: 'rgba(201,74,74,0.16)'
  },
  stockTextOk: {
    color: '#cfe7d9',
    fontSize: 12,
    fontWeight: '700'
  },
  stockTextOut: {
    color: '#f0c0c0',
    fontSize: 12,
    fontWeight: '700'
  },
  filtersDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 2
  }
});

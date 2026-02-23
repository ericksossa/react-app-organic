import React from 'react';
import {
  Image,
  ImageBackground,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppText } from '../../../shared/ui/AppText';
import { HomeStackParamList } from '../../../app/navigation/types';
import { useAuthStore } from '../../../state/authStore';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { toCachedImageSource } from '../../../shared/utils/media';
import { useTheme } from '../../../shared/theme/useTheme';
import { getItem, setItem } from '../../../services/storage/kvStorage';
import { storageKeys } from '../../../config/storageKeys';
import { brandMicrocopy, getZoneDeliveryMicrocopy } from '../../../shared/copy/brand-microcopy';
import { getCatalog } from '../../../services/api/catalogApi';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';
import { Reveal } from '../../../design/motion/Reveal';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1400&q=80';

const CATEGORY_IMAGES = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1505576633757-0ac1084af824?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80'
];

const FEATURED_ITEMS = [
  {
    id: 'featured-basket',
    image: 'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80',
    eyebrow: 'PICK',
    title: 'Canastas de temporada'
  },
  {
    id: 'featured-producers',
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80',
    eyebrow: 'NEW',
    title: 'Productores locales'
  }
];

const CURATED_IMAGE =
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=1400&q=80';
const HOME_FIRST_BLOCK_SNAP_Y = 92;
const HOME_FIRST_BLOCK_SNAP_THRESHOLD = 52;
const IS_ANDROID = Platform.OS === 'android';
const HOME_CARD_SHADOW_OPACITY = IS_ANDROID ? 0.14 : 0.26;
const HOME_CARD_SHADOW_RADIUS = IS_ANDROID ? 10 : 18;
const HOME_CARD_ELEVATION = IS_ANDROID ? 6 : 10;
const HOME_SNAP_OVERSHOOT_TOP = IS_ANDROID ? 10 : 14;
const HOME_SNAP_OVERSHOOT_BLOCK = IS_ANDROID ? 6 : 10;
const HOME_SNAP_SETTLE_MS = IS_ANDROID ? 90 : 120;
const HOME_SEARCH_SUGGESTIONS = [
  '🍓 Frutas',
  '🥬 Verduras',
  '🌱 Aromáticas',
  '🥛 Lácteos',
  '🥖 Panadería',
  '🌾 Cereales',
  '🫘 Legumbres'
];
const CATEGORY_SLUG_BY_LABEL: Record<string, string> = {
  frutas: 'frutas',
  verduras: 'verduras',
  aromaticas: 'aromaticas',
  aromáticas: 'aromaticas',
  lacteos: 'lacteos',
  lácteos: 'lacteos',
  panaderia: 'panaderia',
  panadería: 'panaderia',
  cereales: 'cereales',
  legumbres: 'legumbres'
};
const HOME_SEARCH_HISTORY_LIMIT = 6;

type HomeSearchMemory = {
  lastQuery: string;
  recentSuggestions: string[];
};

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

type TopIconName = 'sun' | 'moon' | 'bookmark' | 'share' | 'search' | 'exit';

function TopActionIcon({ name, color }: { name: TopIconName; color: string }) {
  const iconName: React.ComponentProps<typeof Feather>['name'] =
    name === 'sun'
      ? 'sun'
      : name === 'moon'
        ? 'moon'
        : name === 'bookmark'
          ? 'bookmark'
          : name === 'share'
            ? 'share-2'
            : name === 'search'
              ? 'search'
              : 'log-out';

  return <Feather name={iconName} color={color} size={21} />;
}

function ScrollRevealCard({
  index,
  scrollY,
  style,
  children
}: {
  index: number;
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const revealStyle = useAnimatedStyle(() => {
    const revealStart = index * 42;
    const revealEnd = revealStart + 260;
    const depthStrength = interpolate(
      scrollY.value,
      [0, revealStart, revealEnd],
      [1, 1, 0.55],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, revealStart, revealEnd],
            [0, 0, -10],
            Extrapolation.CLAMP
          )
        },
        {
          scale: interpolate(scrollY.value, [0, revealStart, revealEnd], [1, 1, 1], Extrapolation.CLAMP)
        }
      ],
      opacity: interpolate(scrollY.value, [0, revealStart, revealEnd], [1, 1, 0.93], Extrapolation.CLAMP),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: HOME_CARD_SHADOW_RADIUS,
      shadowOpacity: HOME_CARD_SHADOW_OPACITY * depthStrength,
      elevation: HOME_CARD_ELEVATION * depthStrength
    };
  }, [index, scrollY]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 56).duration(340)} style={[style, { overflow: 'visible' }]}>
      <Animated.View style={revealStyle}>{children}</Animated.View>
    </Animated.View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const selectedZoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const selectedZone = useAvailabilityStore((s) => s.selectedZone);
  const { mode, toggleMode, colors } = useTheme();
  const reduceMotion = useReducedMotionSetting();
  const isLight = mode === 'light';
  const actionColor = isLight ? '#1f2421' : '#f2f6f4';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchVisible, setIsSearchVisible] = React.useState(false);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [recentSuggestions, setRecentSuggestions] = React.useState<string[]>([]);
  const [availableProductsCount, setAvailableProductsCount] = React.useState<number | null>(null);
  const searchInputRef = React.useRef<TextInput | null>(null);
  const scrollRef = React.useRef<React.ComponentRef<typeof Animated.ScrollView> | null>(null);
  const scrollY = useSharedValue(0);
  const lastSnapTargetRef = React.useRef<number | null>(null);
  const snapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeSuggestionText = React.useCallback((value: string) => {
    return value.replace(/^[^\s]+\s/, '').trim();
  }, []);

  const persistSearchMemory = React.useCallback(
    async (nextQuery: string, nextRecent: string[]) => {
      await setItem<HomeSearchMemory>(storageKeys.homeSearchMemory, {
        lastQuery: nextQuery,
        recentSuggestions: nextRecent.slice(0, HOME_SEARCH_HISTORY_LIMIT)
      });
    },
    []
  );

  const upsertRecentSuggestion = React.useCallback(
    (value: string) => {
      const normalized = normalizeSuggestionText(value);
      if (!normalized) return recentSuggestions;

      const deduped = [normalized, ...recentSuggestions.filter((item) => item !== normalized)];
      return deduped.slice(0, HOME_SEARCH_HISTORY_LIMIT);
    },
    [normalizeSuggestionText, recentSuggestions]
  );

  const suggestions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const suggestionPool = [
      ...recentSuggestions.map((item) => `🔎 ${item}`),
      ...HOME_SEARCH_SUGGESTIONS
    ].filter((item, index, source) => source.indexOf(item) === index);

    if (!q) return suggestionPool.slice(0, 5);

    const filtered = suggestionPool.filter((item) =>
      item.toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered.slice(0, 5) : suggestionPool.slice(0, 3);
  }, [recentSuggestions, searchQuery]);

  const openCatalogWithQuery = React.useCallback(
    async (raw: string) => {
      const value = raw.trim();
      const nextRecent = upsertRecentSuggestion(value);
      setRecentSuggestions(nextRecent);
      await persistSearchMemory(value, nextRecent);

      const normalized = normalizeSuggestionText(value).toLowerCase();
      const initialCategorySlug = CATEGORY_SLUG_BY_LABEL[normalized];

      const parentNav = navigation.getParent();
      if (parentNav) {
        (parentNav as any).navigate('CatalogTab', {
          screen: 'CatalogMain',
          params: value ? { initialQuery: value, initialCategorySlug } : {}
        });
      }
    },
    [navigation, normalizeSuggestionText, persistSearchMemory, upsertRecentSuggestion]
  );

  const activateHomeSearch = React.useCallback(() => {
    setIsSearchVisible(true);
    setIsSearchFocused(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const hydrateSearchMemory = async () => {
        const memory = await getItem<HomeSearchMemory>(storageKeys.homeSearchMemory);
        if (!active || !memory) return;

        if (memory.lastQuery) setSearchQuery(memory.lastQuery);
        if (Array.isArray(memory.recentSuggestions)) {
          setRecentSuggestions(memory.recentSuggestions.slice(0, HOME_SEARCH_HISTORY_LIMIT));
        }
      };

      void hydrateSearchMemory();

      return () => {
        active = false;
      };
    }, [])
  );

  const onHomeScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const maybeSnapToFirstBlock = React.useCallback((y: number) => {
    if (y <= 0 || y >= HOME_FIRST_BLOCK_SNAP_Y) {
      lastSnapTargetRef.current = null;
      return;
    }

    const target = y < HOME_FIRST_BLOCK_SNAP_THRESHOLD ? 0 : HOME_FIRST_BLOCK_SNAP_Y;
    if (Math.abs(y - target) < 2) {
      lastSnapTargetRef.current = null;
      return;
    }

    if (lastSnapTargetRef.current === target) return;
    lastSnapTargetRef.current = target;

    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);

    const overshoot = target === 0 ? HOME_SNAP_OVERSHOOT_TOP : target + HOME_SNAP_OVERSHOOT_BLOCK;
    scrollRef.current?.scrollTo({ y: overshoot, animated: true });
    snapTimeoutRef.current = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: target, animated: true });
      lastSnapTargetRef.current = null;
      snapTimeoutRef.current = null;
    }, HOME_SNAP_SETTLE_MS);
  }, []);

  const onHomeScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      maybeSnapToFirstBlock(event.nativeEvent.contentOffset.y);
    },
    [maybeSnapToFirstBlock]
  );

  React.useEffect(
    () => () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    },
    []
  );

  React.useEffect(() => {
    let active = true;

    const loadEcosystemState = async () => {
      try {
        const response = await getCatalog({
          page: 1,
          limit: 1,
          zoneId: selectedZoneId ?? undefined
        });
        if (!active) return;
        setAvailableProductsCount(Number.isFinite(response.total) ? response.total : response.data.length);
      } catch {
        if (!active) return;
        setAvailableProductsCount(null);
      }
    };

    void loadEcosystemState();

    return () => {
      active = false;
    };
  }, [selectedZoneId]);

  const topBarScrollStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : interpolate(scrollY.value, [0, 120], [0, -8], Extrapolation.CLAMP) }
    ],
    opacity: interpolate(scrollY.value, [0, 120], [1, 0.94], Extrapolation.CLAMP)
  }), [reduceMotion]);

  const heroScrollStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(scrollY.value, [0, 220], [0, -14], Extrapolation.CLAMP) },
          { scale: interpolate(scrollY.value, [0, 220], [1, 1.03], Extrapolation.CLAMP) }
        ]
  }), [reduceMotion]);

  const blockScrollStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(scrollY.value, [0, 240], [0, -6], Extrapolation.CLAMP) }
        ],
    opacity: interpolate(scrollY.value, [0, 300], [1, 0.96], Extrapolation.CLAMP)
  }), [reduceMotion]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <Animated.ScrollView
        ref={scrollRef}
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onHomeScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={onHomeScrollEnd}
        onMomentumScrollEnd={onHomeScrollEnd}
      >
        <Animated.View style={[styles.topBar, { borderBottomColor: colors.border1 }, topBarScrollStyle]}>
          <AppText style={[styles.brand, { color: colors.text1 }]}>GreenCart</AppText>
          <View style={styles.topActions}>
            <Pressable style={styles.iconButton} onPress={() => toggleMode()}>
              <TopActionIcon name={isLight ? 'moon' : 'sun'} color={actionColor} />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <TopActionIcon name="bookmark" color={actionColor} />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <TopActionIcon name="share" color={actionColor} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={activateHomeSearch}>
              <TopActionIcon name="search" color={actionColor} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => logout()}>
              <TopActionIcon name="exit" color={actionColor} />
            </Pressable>
          </View>
        </Animated.View>

        {isSearchVisible ? (
          <View
            style={[
              styles.homeSearchCard,
              {
                borderColor:
                  isSearchFocused || searchQuery.trim().length > 0
                    ? isLight
                      ? 'rgba(40,179,130,0.52)'
                      : 'rgba(111,168,138,0.52)'
                    : colors.border1,
                backgroundColor: isLight ? '#eff5f1' : '#0f1914'
              }
            ]}
          >
            <View
              style={[
                styles.homeSearchIconWrap,
                {
                  backgroundColor: isLight
                    ? 'rgba(0,0,0,0.05)'
                    : 'rgba(255,255,255,0.06)'
                }
              ]}
            >
              <Feather name="search" size={16} color={isLight ? '#2a5f49' : '#cfe4d8'} />
            </View>
            <TextInput
              ref={searchInputRef}
              placeholder="Busca frutas, verduras o productores"
              placeholderTextColor={colors.text2}
              style={[styles.homeSearchInput, { color: colors.text1 }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onSubmitEditing={() => {
                void openCatalogWithQuery(searchQuery);
              }}
              returnKeyType="search"
            />
            {searchQuery.trim().length > 0 ? (
              <Pressable
                style={[
                  styles.homeSearchClear,
                  { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.09)' }
                ]}
                onPress={() => setSearchQuery('')}
              >
                <Feather name="x" size={16} color={isLight ? '#305b48' : '#dce9e1'} />
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.homeSearchClear,
                  { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.09)' }
                ]}
                onPress={() => {
                  setIsSearchVisible(false);
                  setIsSearchFocused(false);
                }}
              >
                <Feather name="chevron-up" size={16} color={isLight ? '#305b48' : '#dce9e1'} />
              </Pressable>
            )}
          </View>
        ) : null}

        {isSearchVisible && (isSearchFocused || searchQuery.trim().length > 0) && suggestions.length > 0 ? (
          <View style={styles.homeSuggestionsRow}>
            {suggestions.map((suggestion, index) => (
              <Animated.View
                key={suggestion}
                entering={FadeInDown.delay(index * 42).duration(220)}
              >
                <Pressable
                  style={[
                    styles.homeSuggestionChip,
                    {
                      borderColor: isLight
                        ? 'rgba(40,179,130,0.34)'
                        : 'rgba(111,168,138,0.35)',
                      backgroundColor: isLight
                        ? 'rgba(220,244,233,0.9)'
                        : 'rgba(16,37,29,0.9)'
                    }
                  ]}
                  onPress={() => {
                    const normalized = suggestion.replace(/^[^\s]+\s/, '');
                    setSearchQuery(normalized);
                    void openCatalogWithQuery(normalized);
                  }}
                >
                  <AppText
                    style={{
                      color: isLight ? '#1d634a' : '#d8ebe0',
                      fontSize: 12,
                      fontWeight: '600'
                    }}
                  >
                    {suggestion}
                  </AppText>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ) : null}

        <Animated.View style={heroScrollStyle}>
          <ImageBackground source={toCachedImageSource(HERO_IMAGE)} style={styles.hero} imageStyle={styles.heroImage}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <AppText style={styles.zonePill}>{getZoneDeliveryMicrocopy(selectedZone?.name)}</AppText>
              <AppText style={[styles.deliveryMeta, isLight && { color: '#36403a' }]}>
                Llega a tu puerta en <AppText style={styles.deliveryAccent}>30-60</AppText> min
              </AppText>
              <AppText style={[styles.heroEyebrow, isLight && { color: '#36403a' }]}>🌱 DE MANOS LOCALES</AppText>
              <AppText style={[styles.heroTitle, isLight && { color: '#141916' }]}>{brandMicrocopy.home.heroHeader}</AppText>
              <AppText style={[styles.heroSubtitle, isLight && { color: '#2f3933' }]}>Compra directo a quienes cultivan con cuidado.</AppText>
              <AppButton
                title={isLight ? 'Conocer productores' : 'Ver lo que llegó hoy'}
                onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}
                style={styles.heroCta}
              />
            </View>
          </ImageBackground>
        </Animated.View>

        <ScrollRevealCard index={1} scrollY={scrollY}>
          <Reveal delayMs={40}>
            <View
            style={[
              styles.ecosystemCard,
              {
                backgroundColor: isLight ? '#4f7e5f' : '#447a56',
                shadowColor: isLight ? '#2f5840' : '#163024'
              }
            ]}
            >
              <View
              style={[
                styles.ecosystemLeafAccent,
                { backgroundColor: isLight ? 'rgba(232, 242, 236, 0.1)' : 'rgba(189, 226, 205, 0.08)' }
              ]}
              />
              <AppText style={styles.ecosystemEyebrow}>ESTADO DEL ECOSISTEMA</AppText>
              <AppText style={styles.ecosystemQuote}>
              {availableProductsCount !== null
                ? `Hoy tenemos ${availableProductsCount} productos disponibles en ${selectedZone?.name ?? 'tu zona'}, listos para tu canasta.`
                : 'Estamos afinando la cosecha de hoy para mostrarte disponibilidad real en tu zona.'}
              </AppText>
              <View style={styles.ecosystemFooter}>
                <View style={styles.ecosystemDot} />
                <AppText style={styles.ecosystemMetric}>
                {availableProductsCount !== null
                  ? `${availableProductsCount} productos disponibles ahora`
                  : 'Actualizando disponibilidad'}
                </AppText>
              </View>
            </View>
          </Reveal>
        </ScrollRevealCard>

        <Animated.View style={[styles.categoriesBlock, blockScrollStyle]}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="heading" style={styles.sectionTitle}>
              🥬 Explora por cosecha
            </AppText>
            <Pressable onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}>
              <AppText style={[styles.sectionAction, { color: colors.text2 }]}>Ver todo</AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {CATEGORY_IMAGES.map((item, index) => (
              <ScrollRevealCard key={`${item}-${index}`} index={index + 2} scrollY={scrollY}>
                <Image source={toCachedImageSource(item)} style={styles.categoryThumb} />
              </ScrollRevealCard>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View style={[styles.featuredBlock, blockScrollStyle]}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="heading" style={styles.featuredTitle}>
              ✨ Recién seleccionados
            </AppText>
            <Pressable onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}>
              <AppText style={[styles.sectionAction, { color: colors.text2 }]}>Ir al mercado</AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {FEATURED_ITEMS.map((item, index) => (
              <ScrollRevealCard key={item.id} index={index + 5} scrollY={scrollY}>
                <ImageBackground
                  source={toCachedImageSource(item.image)}
                  style={styles.featuredCard}
                  imageStyle={styles.featuredCardImage}
                >
                  <View style={styles.featuredOverlay} />
                  <View style={styles.featuredContent}>
                    <AppText style={styles.featuredEyebrow}>{item.eyebrow}</AppText>
                    <AppText style={styles.featuredText}>{item.title}</AppText>
                  </View>
                </ImageBackground>
              </ScrollRevealCard>
            ))}
          </ScrollView>
        </Animated.View>

        <ScrollRevealCard index={7} scrollY={scrollY}>
          <ImageBackground
            source={toCachedImageSource(CURATED_IMAGE)}
            style={styles.curatedCard}
            imageStyle={styles.curatedImage}
          >
            <View style={styles.curatedOverlay} />
            <View style={styles.curatedContent}>
              <AppText style={styles.curatedPill}>🌽 Elegido para ti</AppText>
              <AppText style={styles.curatedTitle}>Elegido para tu semana.</AppText>
            </View>
          </ImageBackground>
        </ScrollRevealCard>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040907'
  },
  scroll: {
    flex: 1,
    backgroundColor: '#040907'
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12
  },
  topBar: {
    height: 62,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  brand: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#f2f6f4'
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeSearchCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  homeSearchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15
  },
  homeSearchClear: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -2
  },
  homeSuggestionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  sunCore: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.4,
    borderColor: '#f1f4f2'
  },
  sunRay: {
    position: 'absolute',
    backgroundColor: '#f1f4f2'
  },
  sunRayTop: {
    top: 1,
    left: 8.4,
    width: 1.2,
    height: 3
  },
  sunRayBottom: {
    top: 14,
    left: 8.4,
    width: 1.2,
    height: 3
  },
  sunRayLeft: {
    top: 8.4,
    left: 1,
    width: 3,
    height: 1.2
  },
  sunRayRight: {
    top: 8.4,
    right: 1,
    width: 3,
    height: 1.2
  },
  bookmarkBody: {
    position: 'absolute',
    top: 2,
    left: 5,
    width: 8,
    height: 12,
    borderWidth: 1.4,
    borderColor: '#f1f4f2',
    borderRadius: 1.5
  },
  bookmarkCut: {
    position: 'absolute',
    left: 7.1,
    top: 10.1,
    width: 3.8,
    height: 3.8,
    backgroundColor: '#040907',
    transform: [{ rotate: '45deg' }]
  },
  shareShaft: {
    position: 'absolute',
    left: 8.4,
    top: 3.4,
    width: 1.2,
    height: 8.6,
    backgroundColor: '#f1f4f2'
  },
  shareHeadL: {
    position: 'absolute',
    left: 5.6,
    top: 3.2,
    width: 1.2,
    height: 4.2,
    backgroundColor: '#f1f4f2',
    transform: [{ rotate: '45deg' }]
  },
  shareHeadR: {
    position: 'absolute',
    left: 11.2,
    top: 3.2,
    width: 1.2,
    height: 4.2,
    backgroundColor: '#f1f4f2',
    transform: [{ rotate: '-45deg' }]
  },
  shareBase: {
    position: 'absolute',
    left: 4.5,
    top: 11.8,
    width: 9,
    height: 4.5,
    borderWidth: 1.4,
    borderTopWidth: 0,
    borderColor: '#f1f4f2',
    borderRadius: 1.5
  },
  searchRing: {
    position: 'absolute',
    left: 3,
    top: 3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.4,
    borderColor: '#f1f4f2'
  },
  searchHandle: {
    position: 'absolute',
    left: 11.5,
    top: 11.2,
    width: 5,
    height: 1.2,
    backgroundColor: '#f1f4f2',
    transform: [{ rotate: '45deg' }]
  },
  exitDoor: {
    position: 'absolute',
    left: 2,
    top: 3,
    width: 6,
    height: 12,
    borderWidth: 1.4,
    borderRightWidth: 0,
    borderColor: '#f1f4f2',
    borderRadius: 1.5
  },
  exitShaft: {
    position: 'absolute',
    left: 7.4,
    top: 8.4,
    width: 8,
    height: 1.2,
    backgroundColor: '#f1f4f2'
  },
  exitHeadUp: {
    position: 'absolute',
    left: 12.1,
    top: 6.2,
    width: 1.2,
    height: 4.1,
    backgroundColor: '#f1f4f2',
    transform: [{ rotate: '-45deg' }]
  },
  exitHeadDown: {
    position: 'absolute',
    left: 12.1,
    top: 8.3,
    width: 1.2,
    height: 4.1,
    backgroundColor: '#f1f4f2',
    transform: [{ rotate: '45deg' }]
  },
  hero: {
    minHeight: 520,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-start'
  },
  heroImage: {
    borderRadius: 28
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,8,7,0.28)'
  },
  heroContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20
  },
  zonePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#dff0e8',
    color: '#2b5c46',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10
  },
  deliveryMeta: {
    color: '#d8e3de',
    fontSize: 13,
    marginBottom: 14
  },
  deliveryAccent: {
    color: '#95c08f',
    fontWeight: '700'
  },
  heroEyebrow: {
    color: 'rgba(240,246,242,0.78)',
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    color: '#f4f7f5',
    marginBottom: 10,
    maxWidth: '86%'
  },
  heroSubtitle: {
    color: '#deebe4',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '82%',
    marginBottom: 14
  },
  heroCta: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 44
  },
  ecosystemCard: {
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: 'hidden',
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5
  },
  ecosystemLeafAccent: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -46,
    bottom: -54
  },
  ecosystemEyebrow: {
    color: 'rgba(240,246,242,0.85)',
    letterSpacing: 1.8,
    fontSize: 12,
    fontWeight: '700'
  },
  ecosystemQuote: {
    color: '#f2f6f3',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500'
  },
  ecosystemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  ecosystemDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#2dd082'
  },
  ecosystemMetric: {
    color: '#ecf5ef',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700'
  },
  categoriesBlock: {
    gap: 16,
    paddingHorizontal: 2
  },
  featuredBlock: {
    gap: 12,
    paddingHorizontal: 2,
    overflow: 'visible'
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    maxWidth: '72%'
  },
  sectionAction: {
    color: 'rgba(220,228,223,0.72)',
    letterSpacing: 1,
    fontSize: 12
  },
  categoriesRow: {
    gap: 12,
    paddingLeft: 2,
    paddingRight: 28,
    paddingTop: 4
  },
  categoryThumb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)'
  },
  featuredTitle: {
    fontSize: 16,
    lineHeight: 20
  },
  featuredRow: {
    gap: 12,
    paddingLeft: 2,
    paddingRight: 84,
    paddingTop: 4,
    paddingBottom: 12
  },
  featuredCard: {
    width: 272,
    height: 272,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end'
  },
  featuredCardImage: {
    borderRadius: 22
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 12, 10, 0.2)'
  },
  featuredContent: {
    paddingHorizontal: 16,
    paddingBottom: 18
  },
  featuredEyebrow: {
    color: 'rgba(237,244,240,0.8)',
    letterSpacing: 1.2,
    fontSize: 12,
    marginBottom: 4
  },
  featuredText: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    color: '#edf3ef'
  },
  curatedCard: {
    minHeight: 380,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-start'
  },
  curatedImage: {
    borderRadius: 28
  },
  curatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,16,14,0.22)'
  },
  curatedContent: {
    paddingHorizontal: 22,
    paddingTop: 24
  },
  curatedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#d7e8df',
    color: '#2b5c46',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14
  },
  curatedTitle: {
    fontSize: 50,
    lineHeight: 54,
    color: '#f3f6f4',
    fontWeight: '800',
    maxWidth: '78%'
  }
});

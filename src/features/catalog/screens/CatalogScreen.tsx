import React from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  ListRenderItemInfo,
  Modal,
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

type Props = NativeStackScreenProps<CatalogStackParamList, 'CatalogMain'>;

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

const CatalogRow = React.memo(function CatalogRow({
  item,
  index,
  onOpen,
  onAdd,
  adding
}: {
  item: CatalogProduct;
  index: number;
  onOpen: (slug: string) => void;
  onAdd: (product: CatalogProduct) => void;
  adding: boolean;
}) {
  const { colors: themeColors, isDark } = useTheme();
  const isAvailable = index % 4 !== 0;

  return (
    <View style={[styles.productCard, { borderColor: themeColors.border1, backgroundColor: isDark ? '#0f1512' : '#f5f7f4' }]}>
      <Pressable onPress={() => onOpen(item.slug)}>
        {item.imageUrl ? (
          <Image source={toCachedImageSource(item.imageUrl)} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback} />
        )}
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
                {isAvailable ? 'Dispo' : 'Agotado'}
              </AppText>
            </View>
          </View>
        </View>
      </Pressable>
      <AppButton
        title={adding ? 'Agregando...' : 'Agregar'}
        onPress={() => onAdd(item)}
        disabled={adding}
        style={styles.cardAddButton}
      />
    </View>
  );
});

export function CatalogScreen({ navigation }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const selectedZone = useAvailabilityStore((s) => s.selectedZone);
  const selectZone = useAvailabilityStore((s) => s.selectZone);
  const addItem = useCartStore((s) => s.addItem);
  const [query, setQuery] = React.useState('');
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>(undefined);
  const [zonePickerOpen, setZonePickerOpen] = React.useState(false);
  const [addingProductId, setAddingProductId] = React.useState<string | null>(null);
  const [addError, setAddError] = React.useState<string | null>(null);

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
        setAddError('No se pudo agregar este producto al carrito.');
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

  const listHeader = (
    <View style={{ gap: 16 }}>
      <AppCard style={[styles.zoneCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]}>
        <Pressable
          style={[styles.zoneTrigger, { borderColor: themeColors.border1, backgroundColor: isDark ? '#121815' : '#eef2ee' }]}
          onPress={() => setZonePickerOpen(true)}
        >
          <AppText style={[styles.zoneLabel, { color: themeColors.text2 }]}>Zona</AppText>
          <AppText style={[styles.zoneText, { color: themeColors.text1 }]}>
            {selectedZone?.city ? `${selectedZone.city} / ` : ''}
            {selectedZone?.name ?? 'Bello / Cabañas'}
          </AppText>
          <AppIcon name="chevron-down" color={themeColors.text2} size={14} />
        </Pressable>
      </AppCard>

      <AppCard style={[styles.searchCard, { backgroundColor: isDark ? '#111714' : '#eef2ee', borderColor: themeColors.border1 }]}>
        <View style={styles.searchIcon}>
          <AppIcon name="search" color={themeColors.text2} size={16} />
        </View>
        <TextInput
          placeholder="Buscar productos..."
          placeholderTextColor={themeColors.text2}
          style={[styles.searchInput, { color: themeColors.text1 }]}
          value={query}
          onChangeText={setQuery}
        />
      </AppCard>

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
              onPress={() => setCategorySlug(item.slug)}
            >
              <AppText style={[isActive ? styles.chipTextActive : styles.chipText, { color: isActive ? themeColors.text1 : themeColors.text2 }]}>
                {`${getCategoryEmoji(item.name, item.slug)} ${item.name}`}
              </AppText>
            </Pressable>
          );
        }}
      />

      <View style={[styles.filtersDivider, { backgroundColor: themeColors.border1 }]} />

      {catalogQuery.isLoading ? <AppText>Cargando catalogo...</AppText> : null}
      {catalogQuery.isError ? <AppText style={{ color: themeColors.danger }}>No se pudo cargar el catalogo.</AppText> : null}
      {addError ? <AppText style={{ color: themeColors.danger }}>{addError}</AppText> : null}

      {featured ? (
        <ImageBackground
          source={toCachedImageSource(featured.imageUrl)}
          style={styles.featuredCard}
          imageStyle={styles.featuredImage}
        >
          <View style={[styles.featuredOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)' }]} />
          <View style={styles.featuredContent}>
            <AppText style={styles.featuredEyebrow}>Seleccion editorial</AppText>
            <AppText style={styles.featuredName}>{featured.name}</AppText>
            <AppButton
              title={addingProductId === featured.id ? 'Agregando...' : 'Agregar'}
              onPress={() => void handleAddFromCatalog(featured)}
              disabled={addingProductId === featured.id}
              style={styles.addButton}
            />
          </View>
        </ImageBackground>
      ) : null}

      {!catalogQuery.isLoading && !catalogQuery.isError && products.length === 0 ? (
        <AppCard style={{ backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }}>
          <AppText>No hay resultados para esta búsqueda/filtro.</AppText>
        </AppCard>
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
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ padding: 14, gap: 14 }}
        columnWrapperStyle={{ gap: 10 }}
        ListHeaderComponent={listHeader}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
      />

      <Modal visible={zonePickerOpen} transparent animationType="fade" onRequestClose={() => setZonePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setZonePickerOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: themeColors.surface1, borderColor: themeColors.border1 }]} onPress={() => {}}>
            <AppText variant="heading">Selecciona tu zona</AppText>
            <View style={styles.zoneOptions}>
              {zones.map((zone) => {
                const isSelected = zone.id === zoneId;
                return (
                  <AppButton
                    key={zone.id}
                    title={`${zone.city ? `${zone.city} / ` : ''}${zone.name}`}
                    tone={isSelected ? 'primary' : 'ghost'}
                    onPress={() => {
                      void selectZone({ id: zone.id, name: zone.name, city: zone.city });
                      setZonePickerOpen(false);
                    }}
                  />
                );
              })}
            </View>
            <AppButton title="Cerrar" tone="ghost" onPress={() => setZonePickerOpen(false)} />
          </Pressable>
        </Pressable>
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
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: '#121815',
    paddingHorizontal: 12,
    paddingVertical: 12
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
  zoneOptions: {
    gap: 8
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
  searchCard: {
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: '#111714'
  },
  searchIcon: {
    marginLeft: 4
  },
  searchInput: {
    flex: 1,
    color: colors.text1,
    fontSize: 16
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
    borderRadius: 12,
    minHeight: 38,
    paddingHorizontal: 20
  },
  productCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: '#0f1512',
    overflow: 'hidden'
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface2
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
    marginBottom: 10
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

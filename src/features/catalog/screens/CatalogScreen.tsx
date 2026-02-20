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
import { CatalogProduct, getCatalog, getCategories } from '../../../services/api/catalogApi';
import { AppCard } from '../../../shared/ui/AppCard';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { colors } from '../../../shared/theme/tokens';
import { listDeliveryZones } from '../../../services/api/availabilityApi';
import { toCachedImageSource } from '../../../shared/utils/media';

type Props = NativeStackScreenProps<CatalogStackParamList, 'CatalogMain'>;

const CatalogRow = React.memo(function CatalogRow({
  item,
  index,
  onOpen
}: {
  item: CatalogProduct;
  index: number;
  onOpen: (slug: string) => void;
}) {
  const isAvailable = index % 4 !== 0;

  return (
    <Pressable style={styles.productCard} onPress={() => onOpen(item.slug)}>
      {item.imageUrl ? (
        <Image source={toCachedImageSource(item.imageUrl)} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={styles.imageFallback} />
      )}
      <View style={styles.productMeta}>
        <AppText style={styles.productName} numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText style={styles.productPrice}>COP{Number(item.priceFrom ?? 0).toLocaleString('es-CO')}</AppText>
        <View style={[styles.stockPill, isAvailable ? styles.stockPillOk : styles.stockPillOut]}>
          <AppText style={isAvailable ? styles.stockTextOk : styles.stockTextOut}>
            {isAvailable ? '◌ Dispo' : '⨯ Agotado'}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

export function CatalogScreen({ navigation }: Props) {
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const selectedZone = useAvailabilityStore((s) => s.selectedZone);
  const selectZone = useAvailabilityStore((s) => s.selectZone);
  const [query, setQuery] = React.useState('');
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>(undefined);
  const [zonePickerOpen, setZonePickerOpen] = React.useState(false);

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
      <AppCard style={styles.zoneCard}>
        <Pressable style={styles.zoneTrigger} onPress={() => setZonePickerOpen(true)}>
          <AppText style={styles.zoneLabel}>Zona</AppText>
          <AppText style={styles.zoneText}>
            {selectedZone?.city ? `${selectedZone.city} / ` : ''}
            {selectedZone?.name ?? 'Bello / Cabañas'}
          </AppText>
          <AppText style={{ color: colors.text2 }}>▾</AppText>
        </Pressable>
      </AppCard>

      <AppCard style={styles.searchCard}>
        <AppText style={styles.searchIcon}>⌕</AppText>
        <TextInput
          placeholder="Buscar productos..."
          placeholderTextColor={colors.text2}
          style={styles.searchInput}
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
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setCategorySlug(item.slug)}
            >
              <AppText style={styles.chipEmoji}>{getCategoryEmoji(item.name)}</AppText>
              <AppText style={isActive ? styles.chipTextActive : styles.chipText}>{item.name}</AppText>
            </Pressable>
          );
        }}
      />

      <View style={styles.filtersDivider} />

      {catalogQuery.isLoading ? <AppText>Cargando catalogo...</AppText> : null}
      {catalogQuery.isError ? <AppText style={{ color: colors.danger }}>No se pudo cargar el catalogo.</AppText> : null}

      {featured ? (
        <ImageBackground
          source={toCachedImageSource(featured.imageUrl)}
          style={styles.featuredCard}
          imageStyle={styles.featuredImage}
        >
          <View style={styles.featuredOverlay} />
          <View style={styles.featuredContent}>
            <AppText style={styles.featuredEyebrow}>Seleccion editorial</AppText>
            <AppText style={styles.featuredName}>{featured.name}</AppText>
            <AppButton
              title="Agregar"
              onPress={() => navigation.navigate('ProductDetail', { slug: featured.slug })}
              style={styles.addButton}
            />
          </View>
        </ImageBackground>
      ) : null}

      {!catalogQuery.isLoading && !catalogQuery.isError && products.length === 0 ? (
        <AppCard>
          <AppText>No hay resultados para esta búsqueda/filtro.</AppText>
        </AppCard>
      ) : null}
    </View>
  );

  const renderItem = ({ item, index }: ListRenderItemInfo<CatalogProduct>) => (
    <CatalogRow item={item} index={index} onOpen={(slug) => navigation.navigate('ProductDetail', { slug })} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
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
          <Pressable style={styles.modalCard} onPress={() => {}}>
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
    marginLeft: 4,
    color: colors.text2,
    fontSize: 18
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
    gap: 8,
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
  chipEmoji: {
    fontSize: 14
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

function getCategoryEmoji(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('fruta')) return '🍓';
  if (normalized.includes('aromat')) return '🌱';
  if (normalized.includes('verd')) return '🥬';
  if (normalized.includes('lact')) return '🥛';
  if (normalized.includes('snack')) return '🥜';
  return '🧺';
}

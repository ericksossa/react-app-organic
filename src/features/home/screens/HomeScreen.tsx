import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppText } from '../../../shared/ui/AppText';
import { HomeStackParamList } from '../../../app/navigation/types';
import { useAuthStore } from '../../../state/authStore';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { toCachedImageSource } from '../../../shared/utils/media';
import { useTheme } from '../../../shared/theme/useTheme';

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

export function HomeScreen({ navigation }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const selectedZone = useAvailabilityStore((s) => s.selectedZone);
  const { mode, toggleMode, colors } = useTheme();
  const isLight = mode === 'light';
  const actionColor = isLight ? '#1f2421' : '#f2f6f4';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, { borderBottomColor: colors.border1 }]}>
          <AppText style={[styles.brand, { color: colors.text1 }]}>organico</AppText>
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
            <Pressable style={styles.iconButton} onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}>
              <TopActionIcon name="search" color={actionColor} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => logout()}>
              <TopActionIcon name="exit" color={actionColor} />
            </Pressable>
          </View>
        </View>

        <ImageBackground source={toCachedImageSource(HERO_IMAGE)} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <AppText style={styles.zonePill}>Zona activa: {selectedZone?.name ?? 'Bello / Cabañas'}</AppText>
            <AppText style={[styles.deliveryMeta, isLight && { color: '#36403a' }]}>
              Entrega estimada: <AppText style={styles.deliveryAccent}>30-60</AppText> min
            </AppText>
            <AppText style={[styles.heroEyebrow, isLight && { color: '#36403a' }]}>PRODUCTORES LOCALES</AppText>
            <AppText style={[styles.heroTitle, isLight && { color: '#141916' }]}>Historias cortas, ingredientes honestos.</AppText>
            <AppText style={[styles.heroSubtitle, isLight && { color: '#2f3933' }]}>Compra directo a quienes cuidan la tierra.</AppText>
            <AppButton
              title={isLight ? 'Ver productores' : 'Descubrir snacks'}
              onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}
              style={styles.heroCta}
            />
          </View>
        </ImageBackground>

        <View style={styles.categoriesBlock}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="heading" style={styles.sectionTitle}>
              Descubre por categorías
            </AppText>
            <Pressable onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}>
              <AppText style={[styles.sectionAction, { color: colors.text2 }]}>EXPLORAR</AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {CATEGORY_IMAGES.map((item, index) => (
              <Image key={`${item}-${index}`} source={toCachedImageSource(item)} style={styles.categoryThumb} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.featuredBlock}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="heading" style={styles.featuredTitle}>
              Destacados
            </AppText>
            <Pressable onPress={() => navigation.getParent()?.navigate('CatalogTab' as never)}>
              <AppText style={[styles.sectionAction, { color: colors.text2 }]}>VER CATÁLOGO</AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {FEATURED_ITEMS.map((item) => (
              <ImageBackground
                key={item.id}
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
            ))}
          </ScrollView>
        </View>

        <ImageBackground
          source={toCachedImageSource(CURATED_IMAGE)}
          style={styles.curatedCard}
          imageStyle={styles.curatedImage}
        >
          <View style={styles.curatedOverlay} />
          <View style={styles.curatedContent}>
            <AppText style={styles.curatedPill}>Curado para ti</AppText>
            <AppText style={styles.curatedTitle}>Historias cortas, ingredientes honestos.</AppText>
          </View>
        </ImageBackground>
      </ScrollView>
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
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    color: '#f4f7f5',
    marginBottom: 10,
    maxWidth: '74%'
  },
  heroSubtitle: {
    color: '#deebe4',
    fontSize: 15,
    lineHeight: 21,
    maxWidth: '72%',
    marginBottom: 16
  },
  heroCta: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    paddingHorizontal: 18,
    minHeight: 50
  },
  categoriesBlock: {
    gap: 12,
    paddingHorizontal: 2
  },
  featuredBlock: {
    gap: 12,
    paddingHorizontal: 2
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
    paddingRight: 24
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
    paddingRight: 60
  },
  featuredCard: {
    width: 240,
    height: 240,
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
    paddingHorizontal: 14,
    paddingBottom: 14
  },
  featuredEyebrow: {
    color: 'rgba(237,244,240,0.8)',
    letterSpacing: 1.2,
    fontSize: 12,
    marginBottom: 4
  },
  featuredText: {
    fontSize: 32,
    lineHeight: 36,
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

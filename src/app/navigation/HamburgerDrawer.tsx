import React from 'react';
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  Keyboard,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  View
} from 'react-native';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useTheme } from '../../shared/theme/useTheme';
import { AppText } from '../../shared/ui/AppText';
import { useAuthStore } from '../../state/authStore';
import { navigationRef } from './navigationRef';
import { isFeatureEnabled } from '../../shared/feature-flags/featureFlags';

type HamburgerDrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const HamburgerDrawerContext = React.createContext<HamburgerDrawerContextValue>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {}
});

export function useHamburgerDrawer() {
  return React.useContext(HamburgerDrawerContext);
}

export function HamburgerDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const closeDrawer = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const openDrawer = React.useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(true);
  }, []);

  const toggleDrawer = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({ isOpen, openDrawer, closeDrawer, toggleDrawer }),
    [closeDrawer, isOpen, openDrawer, toggleDrawer]
  );

  return <HamburgerDrawerContext.Provider value={value}>{children}</HamburgerDrawerContext.Provider>;
}

type DrawerItemProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'default' | 'danger';
  isDark: boolean;
};

function DrawerItem({ icon, label, onPress, accessibilityLabel, tone = 'default', isDark }: DrawerItemProps) {
  const defaultIconColor = isDark ? '#d6ece1' : '#3c6654';
  const defaultLabelColor = isDark ? '#e8f3ee' : '#234f3e';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemRow,
        pressed ? styles.itemPressed : null,
        tone === 'danger' ? styles.itemDangerBg : null
      ]}
    >
      <View style={styles.itemIconCell}>
        <Feather name={icon} size={17} color={tone === 'danger' ? '#e86a6a' : defaultIconColor} />
      </View>
      <AppText
        style={[
          styles.itemLabel,
          { color: defaultLabelColor },
          tone === 'danger' ? styles.itemLabelDanger : null
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

const DRAWER_WIDTH = 312;
const EDGE_SWIPE_WIDTH = 24;

export function HamburgerDrawer() {
  const { isOpen, openDrawer, closeDrawer } = useHamburgerDrawer();
  const { colors, isDark, mode, toggleMode } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const firstFocusableRef = React.useRef<View | null>(null);

  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: isOpen ? 240 : 200,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad)
    });
  }, [isOpen, progress]);

  React.useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      const target = firstFocusableRef.current ? findNodeHandle(firstFocusableRef.current) : null;
      if (target) {
        AccessibilityInfo.setAccessibilityFocus(target);
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [isOpen]);

  const drawerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(progress.value, [0, 1], [-DRAWER_WIDTH, 0], Extrapolation.CLAMP) }],
      opacity: interpolate(progress.value, [0, 1], [0.98, 1], Extrapolation.CLAMP)
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.4], Extrapolation.CLAMP)
  }));

  const sharedAction = React.useCallback(async () => {
    try {
      await Share.share({
        message: 'GreenCart: mercado organico local, entregas rapidas y compras conscientes.'
      });
    } catch {
      Alert.alert('No pudimos abrir compartir', 'Intenta de nuevo en unos segundos.');
    } finally {
      closeDrawer();
    }
  }, [closeDrawer]);

  const goToNested = React.useCallback((tabName: string, nestedScreen?: string, params?: object) => {
    if (!navigationRef.isReady()) {
      closeDrawer();
      return;
    }

    (navigationRef.navigate as any)(
      'MainTabs',
      {
        screen: 'App',
        params: {
          screen: tabName,
          ...(nestedScreen ? { params: { screen: nestedScreen, ...(params ? { params } : {}) } } : {})
        }
      }
    );
    closeDrawer();
  }, [closeDrawer]);

  const openExternalDoc = React.useCallback(async (kind: 'about' | 'privacy' | 'support') => {
    const url =
      kind === 'about'
        ? 'https://greencart.app/about'
        : kind === 'privacy'
          ? 'https://greencart.app/privacy'
          : 'https://greencart.app/support';

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No pudimos abrir el enlace', 'Revisa tu conexion e intenta de nuevo.');
    } finally {
      closeDrawer();
    }
  }, [closeDrawer]);

  const onLogout = React.useCallback(async () => {
    try {
      await logout();
    } finally {
      closeDrawer();
    }
  }, [closeDrawer, logout]);

  const onLogin = React.useCallback(() => {
    if (!navigationRef.isReady()) {
      closeDrawer();
      return;
    }

    (navigationRef.navigate as any)('MainTabs', { screen: 'Auth', params: { screen: 'Login' } });
    closeDrawer();
  }, [closeDrawer]);

  const closeSwipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(isOpen)
        .activeOffsetX([-10, 10])
        .onEnd((event) => {
          if (event.translationX < -28 || event.velocityX < -460) {
            runOnJS(closeDrawer)();
          }
        }),
    [closeDrawer, isOpen]
  );

  const edgeOpenGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isOpen)
        .activeOffsetX([-8, 8])
        .onEnd((event) => {
          if (event.translationX > 34 || event.velocityX > 500) {
            runOnJS(() => {
              Keyboard.dismiss();
              openDrawer();
            })();
          }
        }),
    [isOpen, openDrawer]
  );

  const openFromEdge = React.useCallback(() => {
    Keyboard.dismiss();
    openDrawer();
  }, [openDrawer]);

  const edgeTapGesture = React.useMemo(
    () =>
      Gesture.Tap()
        .enabled(!isOpen)
        .onEnd(() => {
          runOnJS(openFromEdge)();
        }),
    [isOpen, openFromEdge]
  );

  const userName = user?.fullName?.trim() || user?.email || 'Cliente GreenCart';
  const version = Constants.expoConfig?.version ?? '0.1.0';
  const drawerBackground = isDark ? '#0f1b17' : '#f2faf5';
  const drawerBorder = isDark ? 'rgba(191,233,209,0.20)' : 'rgba(25,82,58,0.18)';
  const ordersEnabled = isFeatureEnabled('orders');
  const tabCatalogEnabled = isFeatureEnabled('tabCatalog');
  const tabVoiceEnabled = isFeatureEnabled('tabVoice');

  return (
    <>
      <GestureDetector gesture={Gesture.Exclusive(edgeOpenGesture, edgeTapGesture)}>
        <View pointerEvents={isOpen ? 'none' : 'box-only'} style={styles.edgeSwipeStrip} />
      </GestureDetector>

      <View pointerEvents={isOpen ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menu lateral"
            onPress={closeDrawer}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <GestureDetector gesture={closeSwipeGesture}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.drawer,
              {
                width: DRAWER_WIDTH,
                backgroundColor: drawerBackground,
                borderRightColor: drawerBorder,
                shadowColor: isDark ? '#000000' : '#1d3f30'
              },
              drawerAnimatedStyle
            ]}
          >
            <View style={styles.drawerContent}>
              <View style={styles.userBlock} ref={firstFocusableRef}>
                {!isAuthenticated ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Iniciar sesion"
                    onPress={onLogin}
                    style={({ pressed }) => [styles.loginCta, pressed ? styles.itemPressed : null]}
                  >
                    <Feather name="user" size={18} color="#0f3a29" />
                    <AppText style={styles.loginCtaText}>Iniciar sesion</AppText>
                  </Pressable>
                ) : (
                  <View style={styles.authRow}>
                    <View style={styles.avatarCircle}>
                      <AppText style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={[styles.userName, { color: colors.text1 }]} numberOfLines={1}>
                        {userName}
                      </AppText>
                      <AppText style={[styles.userMeta, { color: colors.text2 }]}>Cuenta activa</AppText>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <AppText style={[styles.sectionTitle, { color: isDark ? '#a8c8ba' : '#2a5a46' }]}>Usuario</AppText>
                <DrawerItem
                  icon={isAuthenticated ? 'user' : 'log-in'}
                  label={isAuthenticated ? 'Perfil' : 'Iniciar sesion'}
                  onPress={isAuthenticated ? closeDrawer : onLogin}
                  accessibilityLabel={isAuthenticated ? 'Abrir perfil' : 'Ir a iniciar sesion'}
                  isDark={isDark}
                />
                {ordersEnabled ? (
                  <DrawerItem
                    icon="shopping-bag"
                    label="Mis pedidos"
                    onPress={() => goToNested('HomeTab', 'OrdersMain')}
                    accessibilityLabel="Abrir mis pedidos"
                    isDark={isDark}
                  />
                ) : null}
                {tabCatalogEnabled ? (
                  <DrawerItem
                    icon="heart"
                    label="Favoritos"
                    onPress={() => goToNested('CatalogTab', 'CatalogMain')}
                    accessibilityLabel="Abrir favoritos"
                    isDark={isDark}
                  />
                ) : null}
              </View>

              <SectionDivider />

              <View style={styles.section}>
                <AppText style={[styles.sectionTitle, { color: isDark ? '#a8c8ba' : '#2a5a46' }]}>Funciones</AppText>
                <DrawerItem
                  icon={mode === 'light' ? 'moon' : 'sun'}
                  label={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
                  onPress={() => {
                    toggleMode();
                    closeDrawer();
                  }}
                  accessibilityLabel={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
                  isDark={isDark}
                />
                <DrawerItem
                  icon="share-2"
                  label="Compartir GreenCart"
                  onPress={() => {
                    void sharedAction();
                  }}
                  accessibilityLabel="Compartir GreenCart"
                  isDark={isDark}
                />
                {tabCatalogEnabled ? (
                  <DrawerItem
                    icon="bookmark"
                    label="Guardados / Wishlist"
                    onPress={() => goToNested('CatalogTab', 'CatalogMain')}
                    accessibilityLabel="Abrir guardados"
                    isDark={isDark}
                  />
                ) : null}
              </View>

              <SectionDivider />

              <View style={styles.section}>
                <AppText style={[styles.sectionTitle, { color: isDark ? '#a8c8ba' : '#2a5a46' }]}>Navegacion rapida</AppText>
                {tabCatalogEnabled ? (
                  <DrawerItem
                    icon="search"
                    label="Buscar productos"
                    onPress={() => goToNested('CatalogTab', 'CatalogMain')}
                    accessibilityLabel="Buscar productos"
                    isDark={isDark}
                  />
                ) : null}
                {tabCatalogEnabled ? (
                  <DrawerItem
                    icon="grid"
                    label="Explorar categorias"
                    onPress={() => goToNested('CatalogTab', 'CatalogMain')}
                    accessibilityLabel="Explorar categorias"
                    isDark={isDark}
                  />
                ) : null}
                {tabVoiceEnabled ? (
                  <DrawerItem
                    icon="mic"
                    label="Asistente por voz"
                    onPress={() => goToNested('VoiceTab', 'VoiceMain')}
                    accessibilityLabel="Abrir asistente por voz"
                    isDark={isDark}
                  />
                ) : null}
              </View>

              <SectionDivider />

              <View style={styles.section}>
                <AppText style={[styles.sectionTitle, { color: isDark ? '#a8c8ba' : '#2a5a46' }]}>Informacion</AppText>
                <DrawerItem
                  icon="info"
                  label="Sobre GreenCart"
                  onPress={() => {
                    void openExternalDoc('about');
                  }}
                  accessibilityLabel="Abrir informacion sobre GreenCart"
                  isDark={isDark}
                />
                <DrawerItem
                  icon="shield"
                  label="Terminos y privacidad"
                  onPress={() => {
                    void openExternalDoc('privacy');
                  }}
                  accessibilityLabel="Abrir terminos y privacidad"
                  isDark={isDark}
                />
                <DrawerItem
                  icon="help-circle"
                  label="Soporte"
                  onPress={() => {
                    void openExternalDoc('support');
                  }}
                  accessibilityLabel="Abrir soporte"
                  isDark={isDark}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <AppText style={[styles.version, { color: colors.text2 }]}>Version {version}</AppText>
              {isAuthenticated ? (
                <DrawerItem
                  icon="log-out"
                  label="Cerrar sesion"
                  onPress={() => {
                    void onLogout();
                  }}
                  accessibilityLabel="Cerrar sesion"
                  tone="danger"
                  isDark={isDark}
                />
              ) : null}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  edgeSwipeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_SWIPE_WIDTH,
    zIndex: 18
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000'
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingTop: 48,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderRightWidth: 1,
    shadowOffset: { width: 7, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 14,
    overflow: 'hidden'
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 8
  },
  userBlock: {
    marginBottom: 4
  },
  loginCta: {
    backgroundColor: '#8de1b5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  loginCtaText: {
    color: '#0f3a29',
    fontSize: 15,
    fontWeight: '800'
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(143, 224, 182, 0.24)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    color: '#dff5e9',
    fontSize: 16,
    fontWeight: '700'
  },
  userName: {
    fontSize: 15,
    fontWeight: '700'
  },
  userMeta: {
    fontSize: 12,
    marginTop: 1
  },
  section: {
    gap: 2
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(176, 211, 194, 0.22)',
    marginVertical: 4,
    marginHorizontal: 2
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 9,
    opacity: 1,
    transform: [{ scale: 1 }]
  },
  itemPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  itemDangerBg: {
    backgroundColor: 'rgba(232, 106, 106, 0.08)'
  },
  itemIconCell: {
    width: 24,
    alignItems: 'flex-start'
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e8f3ee'
  },
  itemLabelDanger: {
    color: '#e86a6a'
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(176, 211, 194, 0.28)'
  },
  version: {
    fontSize: 11,
    marginBottom: 6,
    opacity: 0.75
  }
});

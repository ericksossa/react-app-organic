import React from 'react';
import { Asset } from 'expo-asset';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoiceAssistantDock } from '../../voice-assistant/ui/VoiceAssistantDock';
import { VoiceOrbScreen } from '../../voice-assistant/ui/VoiceOrbScreen';
import { useTheme } from '../../../shared/theme/useTheme';

function envValue(key: string): string {
  return (process.env[key] ?? '').trim();
}

export function VoiceAssistantScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [bundledAssets, setBundledAssets] = React.useState<{
    cheetahModelPath?: string;
    rhinoContextPath?: string;
    porcupineModelPath?: string;
    porcupineKeywordPath?: string;
  }>({});
  const [assetsReady, setAssetsReady] = React.useState(false);

  const accessKey =
    envValue('EXPO_PUBLIC_PICOVOICE_ACCESS_KEY') || 'ULsNVp4KnQD54mcBQxlUQqnvqgleLLc9n/h+d5r2zOOKE86zaru8sw==';
  const cheetahModelPath = envValue('EXPO_PUBLIC_PICOVOICE_CHEETAH_MODEL_PATH') || bundledAssets.cheetahModelPath || '';
  const rhinoContextPath =
    envValue('EXPO_PUBLIC_PICOVOICE_RHINO_CONTEXT_PATH_ES_CO') || bundledAssets.rhinoContextPath || '';
  const porcupineKeywordPath =
    envValue('EXPO_PUBLIC_PICOVOICE_PORCUPINE_KEYWORD_PATH') || bundledAssets.porcupineKeywordPath || '';
  const porcupineModelPath =
    envValue('EXPO_PUBLIC_PICOVOICE_PORCUPINE_MODEL_PATH') || bundledAssets.porcupineModelPath || '';
  const rhinoModelPath = envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH');
  const voiceOrbUiEnabled =
    envValue('VOICE_ORB_UI').toLowerCase() === 'true' ||
    envValue('EXPO_PUBLIC_VOICE_ORB_UI').toLowerCase() === 'true';

  const hasConfig = Boolean(accessKey && cheetahModelPath && rhinoContextPath);

  React.useEffect(() => {
    let mounted = true;

    const loadBundledVoiceAssets = async () => {
      try {
        const cheetahAsset = Asset.fromModule(require('../../../../assets/cheetah_params_es.pv'));
        const rhinoContextAsset = Asset.fromModule(require('../../../../assets/coffee_maker_ios.rhn'));
        const porcupineModelAsset = Asset.fromModule(require('../../../../assets/porcupine_params_es.pv'));
        const porcupineKeywordAsset = Asset.fromModule(require('../../../../assets/hola_mercado.ppn'));

        await Promise.all([
          cheetahAsset.downloadAsync(),
          rhinoContextAsset.downloadAsync(),
          porcupineModelAsset.downloadAsync(),
          porcupineKeywordAsset.downloadAsync()
        ]);

        if (!mounted) return;

        setBundledAssets({
          cheetahModelPath: cheetahAsset.localUri ?? cheetahAsset.uri,
          rhinoContextPath: rhinoContextAsset.localUri ?? rhinoContextAsset.uri,
          porcupineModelPath: porcupineModelAsset.localUri ?? porcupineModelAsset.uri,
          porcupineKeywordPath: porcupineKeywordAsset.localUri ?? porcupineKeywordAsset.uri
        });
      } catch {
        if (!mounted) return;
        setBundledAssets({});
      } finally {
        if (mounted) setAssetsReady(true);
      }
    };

    void loadBundledVoiceAssets();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#0f1512' : '#f7faf7',
              borderColor: colors.border1
            }
          ]}
        >
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: isDark ? 'rgba(111,168,138,0.14)' : 'rgba(40,179,130,0.10)',
                  borderColor: isDark ? 'rgba(111,168,138,0.22)' : 'rgba(40,179,130,0.18)'
                }
              ]}
            >
              <Feather name="shield" size={12} color={isDark ? '#a3dcc3' : '#198f67'} />
              <Text style={[styles.heroBadgeText, { color: colors.text1 }]}>Privacidad on-device</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text1 }]}>Asistente de voz GreenCart</Text>
            <Text style={[styles.heroSubtitle, { color: colors.text2 }]}>
              Búsqueda orgánica, wake word y carrito por voz con Picovoice, sin enviar audio a la nube.
            </Text>
          </View>

          {assetsReady && !hasConfig && (
            <View
              style={[
                styles.configNotice,
                {
                  backgroundColor: isDark ? 'rgba(201,74,74,0.10)' : 'rgba(184,72,72,0.08)',
                  borderColor: isDark ? 'rgba(201,74,74,0.22)' : 'rgba(184,72,72,0.16)'
                }
              ]}
            >
              <Feather name="alert-triangle" size={15} color={isDark ? '#e0a4a4' : '#b84848'} />
              <Text style={[styles.configNoticeText, { color: colors.text2 }]}>
                {'Faltan modelos de voz para iniciar Picovoice. Configura Cheetah + Rhino (es-CO) en '}
                {'EXPO_PUBLIC_PICOVOICE_*.'}
              </Text>
            </View>
          )}

          <View style={styles.previewRow}>
            <PreviewChip
              label="Wake Word"
              value={porcupineKeywordPath ? 'Custom' : 'Fallback'}
              colors={colors}
              isDark={isDark}
            />
            <PreviewChip label="Idioma" value="es-CO" colors={colors} isDark={isDark} />
            <PreviewChip label="Modo" value={hasConfig ? 'Offline' : assetsReady ? 'Setup' : 'Cargando'} colors={colors} isDark={isDark} />
          </View>

          <Pressable
            onPress={() => {
              (navigation.getParent() as any)?.navigate?.('CatalogTab', {
                screen: 'CatalogMain'
              });
            }}
            style={[
              styles.catalogShortcut,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                borderColor: colors.border1
              }
            ]}
          >
            <Feather name="search" size={16} color={colors.text1} />
            <Text style={[styles.catalogShortcutText, { color: colors.text1 }]}>Abrir catálogo mientras hablas</Text>
            <Feather name="chevron-right" size={16} color={colors.text2} />
          </Pressable>
        </View>

        <View style={styles.stage}>
          {voiceOrbUiEnabled ? (
            <VoiceOrbScreen
              accessKey={accessKey}
              cheetahModelPath={cheetahModelPath}
              rhinoContextPath={rhinoContextPath}
              rhinoModelPath={rhinoModelPath || undefined}
              enabled={assetsReady}
              onOpenCatalog={({ query, categorySlug }) => {
                (navigation.getParent() as any)?.navigate?.('CatalogTab', {
                  screen: 'CatalogMain',
                  params: {
                    initialQuery: query,
                    initialCategorySlug: categorySlug
                  }
                });
              }}
              onOpenOrders={() => {
                (navigation.getParent() as any)?.navigate?.('HomeTab', {
                  screen: 'OrdersMain'
                });
              }}
            />
          ) : (
            <VoiceAssistantDock
              accessKey={accessKey}
              cheetahModelPath={cheetahModelPath}
              rhinoContextPath={rhinoContextPath}
              rhinoModelPath={rhinoModelPath || undefined}
              enabled={assetsReady}
              onOpenCatalog={({ query, categorySlug }) => {
                (navigation.getParent() as any)?.navigate?.('CatalogTab', {
                  screen: 'CatalogMain',
                  params: {
                    initialQuery: query,
                    initialCategorySlug: categorySlug
                  }
                });
              }}
              onOpenOrders={() => {
                (navigation.getParent() as any)?.navigate?.('HomeTab', {
                  screen: 'OrdersMain'
                });
              }}
              style={styles.assistantDock}
            />
          )}
          <View style={styles.placeholderSpace} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function PreviewChip({
  label,
  value,
  colors,
  isDark
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.previewChip,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          borderColor: colors.border1
        }
      ]}
    >
      <Text style={[styles.previewChipLabel, { color: colors.text2 }]}>{label}</Text>
      <Text style={[styles.previewChipValue, { color: colors.text1 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 14
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12
  },
  heroHeader: {
    gap: 6
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700'
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18
  },
  configNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10
  },
  configNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16
  },
  previewRow: {
    flexDirection: 'row',
    gap: 8
  },
  previewChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  previewChipLabel: {
    fontSize: 10,
    textTransform: 'uppercase'
  },
  previewChipValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700'
  },
  catalogShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  catalogShortcutText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600'
  },
  stage: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'flex-end'
  },
  assistantDock: {
    right: 6,
    bottom: 6
  },
  placeholderSpace: {
    height: 4
  }
});

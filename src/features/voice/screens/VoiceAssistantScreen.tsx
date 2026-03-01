import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoiceOrbScreen } from '../../voice-assistant/ui/VoiceOrbScreen';
import { getPicovoiceAccessKey } from '../../voice-assistant/config/picovoice';
import { resolveAssetUri } from '../../voice-assistant/services/stt/assetResolver';
import { useTheme } from '../../../shared/theme/useTheme';

function envValue(key: string): string {
  return (process.env[key] ?? '').trim();
}

export function VoiceAssistantScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [bundledAssets, setBundledAssets] = React.useState<{
    cheetahModelPath?: string;
    rhinoContextPath?: string;
    rhinoModelPath?: string;
  }>({});
  const [assetsReady, setAssetsReady] = React.useState(false);
  const [prewarmToken, setPrewarmToken] = React.useState(0);
  const hasPrewarmedRef = React.useRef(false);

  const accessKey = getPicovoiceAccessKey();
  const cheetahModelPath =
    envValue('EXPO_PUBLIC_PICOVOICE_CHEETAH_MODEL_PATH') || bundledAssets.cheetahModelPath || '';
  const rhinoContextPath =
    envValue('EXPO_PUBLIC_PICOVOICE_RHINO_CONTEXT_PATH_ES_CO') ||
    (Platform.OS === 'android' ? envValue('EXPO_PUBLIC_PICOVOICE_RHINO_CONTEXT_PATH_ANDROID') : '') ||
    bundledAssets.rhinoContextPath ||
    '';
  const rhinoModelPath =
    envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH_IOS') ||
    envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH') ||
    (Platform.OS === 'android' ? envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH_ANDROID') : '') ||
    bundledAssets.rhinoModelPath ||
    '';

  React.useEffect(() => {
    let mounted = true;

    const loadBundledVoiceAssets = async () => {
      try {
        const cheetahModelPathResolved = await resolveAssetUri(require('../../../../assets/cheetah_params_es.pv'));
        const rhinoContextPathResolved =
          Platform.OS === 'ios'
            ? await resolveAssetUri(require('../../../../assets/app_V1_es_ios_v4_0_0.rhn'))
            : undefined;
        const rhinoModelPathResolved =
          Platform.OS === 'ios'
            ? envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH_IOS') || envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH')
            : undefined;

        if (!mounted) return;

        setBundledAssets({
          cheetahModelPath: cheetahModelPathResolved,
          rhinoContextPath: rhinoContextPathResolved,
          rhinoModelPath: rhinoModelPathResolved || undefined
        });
        if (__DEV__ && Platform.OS === 'android') {
          console.debug('[voice-debug][ui] rhino_disabled_android_missing_assets', {
            hasAndroidContextEnv: Boolean(envValue('EXPO_PUBLIC_PICOVOICE_RHINO_CONTEXT_PATH_ANDROID'))
          });
        }
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

  React.useEffect(() => {
    if (!assetsReady || !accessKey) return;
    if (hasPrewarmedRef.current) return;
    hasPrewarmedRef.current = true;
    // PERF: signal prewarm once assets + key are ready.
    setPrewarmToken((value) => value + 1);
  }, [accessKey, assetsReady]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <VoiceOrbScreen
          accessKey={accessKey}
          cheetahModelPath={cheetahModelPath}
          rhinoContextPath={rhinoContextPath}
          rhinoModelPath={rhinoModelPath || undefined}
          enabled={assetsReady}
          prewarmToken={prewarmToken}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20
  }
});

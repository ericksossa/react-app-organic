import React from 'react';
import { Asset } from 'expo-asset';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoiceOrbScreen } from '../../voice-assistant/ui/VoiceOrbScreen';

function envValue(key: string): string {
  return (process.env[key] ?? '').trim();
}

export function VoiceAssistantScreen() {
  const navigation = useNavigation();
  const [bundledAssets, setBundledAssets] = React.useState<{
    cheetahModelPath?: string;
    rhinoContextPath?: string;
  }>({});
  const [assetsReady, setAssetsReady] = React.useState(false);

  const accessKey =
    envValue('EXPO_PUBLIC_PICOVOICE_ACCESS_KEY') || 'ULsNVp4KnQD54mcBQxlUQqnvqgleLLc9n/h+d5r2zOOKE86zaru8sw==';
  const cheetahModelPath =
    envValue('EXPO_PUBLIC_PICOVOICE_CHEETAH_MODEL_PATH') || bundledAssets.cheetahModelPath || '';
  const rhinoContextPath =
    envValue('EXPO_PUBLIC_PICOVOICE_RHINO_CONTEXT_PATH_ES_CO') || bundledAssets.rhinoContextPath || '';
  const rhinoModelPath = envValue('EXPO_PUBLIC_PICOVOICE_RHINO_MODEL_PATH');

  React.useEffect(() => {
    let mounted = true;

    const loadBundledVoiceAssets = async () => {
      try {
        const cheetahAsset = Asset.fromModule(require('../../../../assets/cheetah_params_es.pv'));
        const rhinoContextAsset = Asset.fromModule(require('../../../../assets/coffee_maker_ios.rhn'));

        await Promise.all([cheetahAsset.downloadAsync(), rhinoContextAsset.downloadAsync()]);

        if (!mounted) return;

        setBundledAssets({
          cheetahModelPath: cheetahAsset.localUri ?? cheetahAsset.uri,
          rhinoContextPath: rhinoContextAsset.localUri ?? rhinoContextAsset.uri
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F2'
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20
  }
});

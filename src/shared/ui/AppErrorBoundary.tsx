import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

type State = {
  hasError: boolean;
};

type Props = {
  children: React.ReactNode;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Keep fallback simple for MVP hardening.
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: colors.text1, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Algo salió mal</Text>
          <Text style={{ color: colors.text2, textAlign: 'center', marginBottom: 16 }}>
            Ocurrió un error inesperado en la app. Puedes intentar recargar esta pantalla.
          </Text>
          <Pressable
            onPress={this.reset}
            style={{
              backgroundColor: colors.cta,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10
            }}
          >
            <Text style={{ color: colors.ctaText, fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

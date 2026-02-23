import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { colors } from '../../../shared/theme/tokens';
import { useAuthStore } from '../../../state/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailInvalid = email.length > 0 && !/\S+@\S+\.\S+/.test(email);

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      await login(email.trim().toLowerCase(), password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.root}
      >
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />

        <View style={styles.card}>
          <AppText style={styles.brand}>GREENCART</AppText>
          <AppText variant="title" style={styles.title}>
            Qué bueno verte de nuevo
          </AppText>
          <AppText style={styles.subtitle}>Compra fresco en tu zona, con disponibilidad real.</AppText>

          <AppText style={styles.label}>Correo</AppText>
          <TextInput
            placeholder=""
            placeholderTextColor={colors.text2}
            style={[styles.input, emailInvalid ? styles.inputError : null]}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <AppText style={styles.label}>Contraseña</AppText>
          <TextInput
            placeholder=""
            placeholderTextColor={colors.text2}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <AppButton
            title={submitting ? 'Entrando a tu mercado...' : 'Entrar a GreenCart'}
            disabled={submitting}
            onPress={onSubmit}
            style={styles.cta}
          />

          <View style={styles.linksRow}>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={styles.linkTap}
            >
              <AppText style={[styles.link, styles.linkPrimary]}>Quiero crear mi cuenta</AppText>
            </Pressable>
            <Pressable style={styles.linkTap}>
              <AppText style={[styles.link, styles.linkSecondary]}>Necesito recuperar mi contraseña</AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040907'
  },
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 24,
    backgroundColor: '#040907'
  },
  heroGlowA: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030806'
  },
  heroGlowB: {
    position: 'absolute',
    top: -140,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#0a221a',
    opacity: 0.34
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(11,20,17,0.9)',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16
  },
  brand: {
    color: '#8fd8ba',
    letterSpacing: 1.8,
    fontSize: 11,
    marginBottom: 8
  },
  title: {
    fontSize: 33,
    lineHeight: 38,
    marginBottom: 6,
    fontWeight: '700',
    color: '#e8efea'
  },
  subtitle: {
    color: '#cce0d5',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16
  },
  label: {
    color: '#b6cec2',
    fontSize: 14,
    marginBottom: 6
  },
  input: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 0,
    color: colors.text1,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(10,18,15,0.78)'
  },
  inputError: {
    borderColor: 'rgba(201,74,74,0.85)'
  },
  error: {
    color: colors.danger,
    marginBottom: 8,
    fontSize: 14
  },
  cta: {
    borderRadius: 999,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#1a7853',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 4
  },
  linksRow: {
    marginTop: 2,
    gap: 8
  },
  linkTap: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  link: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center'
  },
  linkPrimary: {
    color: '#9fe7c8',
    fontWeight: '700'
  },
  linkSecondary: {
    color: '#ffd08c',
    fontWeight: '700'
  }
});

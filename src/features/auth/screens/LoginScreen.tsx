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
            Inicia sesión
          </AppText>
          <AppText style={styles.subtitle}>Compra orgánico con disponibilidad real por zona.</AppText>

          <AppText style={styles.label}>Email</AppText>
          <TextInput
            placeholder=""
            placeholderTextColor={colors.text2}
            style={[styles.input, emailInvalid ? styles.inputError : null]}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <AppText style={styles.label}>Password</AppText>
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
            title={submitting ? 'Entrando...' : 'Entrar'}
            disabled={submitting}
            onPress={onSubmit}
            style={styles.cta}
          />

          <View style={styles.linksRow}>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <AppText style={styles.link}>Crear cuenta</AppText>
            </Pressable>
            <Pressable>
              <AppText style={styles.link}>Olvidé mi contraseña</AppText>
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
    color: 'rgba(206,218,211,0.62)',
    letterSpacing: 1.8,
    fontSize: 11,
    marginBottom: 6
  },
  title: {
    fontSize: 33,
    lineHeight: 38,
    marginBottom: 6,
    fontWeight: '700',
    color: '#e8efea'
  },
  subtitle: {
    color: 'rgba(198,211,203,0.9)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 14
  },
  label: {
    color: 'rgba(191,204,197,0.88)',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  link: {
    color: 'rgba(216,225,220,0.85)',
    fontSize: 15
  }
});

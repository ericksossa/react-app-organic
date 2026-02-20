import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../app/navigation/types';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppText } from '../../../shared/ui/AppText';
import { colors } from '../../../shared/theme/tokens';
import { getErrorMessage } from '../../../shared/errors/apiError';
import { register } from '../../../services/auth/authService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInvalid = email.length > 0 && !/\S+@\S+\.\S+/.test(email);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password
      });
      setDone(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos crear tu cuenta.'));
    } finally {
      setLoading(false);
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
          <View style={styles.stepperRow}>
            <View style={styles.stepItemLeft}>
              <View style={styles.dotActive} />
              <AppText style={styles.stepActive}>Cuenta</AppText>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItemRight}>
              <View style={styles.dotInactive} />
              <AppText style={styles.stepInactive}>Dirección</AppText>
            </View>
          </View>

          <AppText style={styles.eyebrow}>REGISTRO 1/2</AppText>
          <AppText variant="title" style={styles.title}>
            Crear cuenta
          </AppText>
          <AppText style={styles.subtitle}>Empieza en segundos. La dirección la configuramos después.</AppText>

          <AppText style={styles.label}>Nombre completo</AppText>
          <TextInput
            placeholder=""
            placeholderTextColor={colors.text2}
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

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

          <AppText style={styles.label}>Teléfono</AppText>
          <TextInput
            placeholder=""
            placeholderTextColor={colors.text2}
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <AppText style={styles.label}>Password</AppText>
          <TextInput
            placeholder=""
            placeholderTextColor={colors.text2}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          {done ? <AppText style={styles.ok}>Cuenta creada. Ahora inicia sesión.</AppText> : null}

          <AppButton
            title={loading ? 'Creando...' : 'Crear cuenta'}
            onPress={onSubmit}
            disabled={loading}
            style={styles.cta}
          />

          <Pressable onPress={() => navigation.navigate('Login')}>
            <AppText style={styles.backLink}>Ya tengo cuenta</AppText>
          </Pressable>
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  stepItemLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepItemRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: 8
  },
  dotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e3eee7',
    marginRight: 6
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(216,225,220,0.56)',
    marginRight: 6
  },
  stepActive: {
    fontSize: 14,
    color: '#e3eee7'
  },
  stepInactive: {
    fontSize: 14,
    color: 'rgba(216,225,220,0.7)'
  },
  eyebrow: {
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
    marginBottom: 6,
    marginTop: 2
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
    marginTop: 2,
    marginBottom: 8,
    fontSize: 14
  },
  ok: {
    color: '#9fd0b7',
    marginTop: 2,
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
  backLink: {
    color: 'rgba(216,225,220,0.85)',
    fontSize: 15
  }
});

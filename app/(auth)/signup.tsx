import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';

function EyeIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </Svg>
  );
}

function EyeOffIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <Path d="m1 1 22 22" />
    </Svg>
  );
}

function ArrowRightIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </Svg>
  );
}

function ArrowLeftIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m12 19-7-7 7-7" />
      <Path d="M19 12H5" />
    </Svg>
  );
}

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signUpWithEmail, isLoading } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Insira seu nome');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Insira seu email');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    const { error } = await signUpWithEmail(email.trim(), password, name.trim());
    if (error) {
      if (error.includes('already registered')) {
        setErrorMsg('Este email já está cadastrado');
      } else {
        setErrorMsg(error);
      }
    }
    // Auth state change in _layout.tsx handles navigation
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Animated.View entering={FadeIn.duration(400)}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
            <ArrowLeftIcon />
          </TouchableOpacity>
        </Animated.View>

        {/* Logo + Tagline */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.logoSection}>
          <View style={styles.logoRow}>
            <Text style={styles.logoVitta}>VITTA</Text>
            <Text style={styles.logoUp}> UP</Text>
          </View>
          <Animated.Text entering={FadeIn.delay(300).duration(600)} style={styles.tagline}>
            Comece sua jornada
          </Animated.Text>
        </Animated.View>

        {/* Glass Signup Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.cardSection}>
          <View style={styles.cardGlow} />
          <View style={styles.card}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardSpecular}
            />

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Criar conta</Text>
              <Text style={styles.cardSubtitle}>Ganhe 100 pontos de boas-vindas</Text>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Name */}
              <Text style={styles.inputLabel}>NOME</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              {/* Email */}
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {/* Password */}
              <Text style={styles.inputLabel}>SENHA</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, { paddingRight: 48, marginBottom: 0 }]}
                  placeholder="Min. 6 caracteres"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </TouchableOpacity>
              </View>

              {/* Bonus badge */}
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusText}>+100 pts de boas-vindas ao criar sua conta</Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF6C24', '#FF8540']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {isLoading ? (
                  <View style={styles.spinner} />
                ) : (
                  <View style={styles.submitContent}>
                    <Text style={styles.submitText}>Criar conta</Text>
                    <ArrowRightIcon />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Login link */}
        <Animated.View entering={FadeIn.delay(500).duration(600)} style={styles.loginRow}>
          <Text style={styles.loginText}>Já tem conta? </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
            <Text style={styles.loginLink}>Entrar</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.Text entering={FadeIn.delay(700).duration(600)} style={styles.footerText}>
          Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },

  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },

  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoVitta: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 40, color: '#FF6C24', letterSpacing: -0.5 },
  logoUp: { fontFamily: 'Montserrat_300Light', fontSize: 40, color: '#fff', letterSpacing: -0.5 },
  tagline: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8, letterSpacing: 1 },

  cardSection: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  cardGlow: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: 28, backgroundColor: 'rgba(255,108,36,0.08)' },
  card: { borderRadius: 24, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 64 },
  cardSpecular: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, zIndex: 5 },
  cardContent: { padding: 28, zIndex: 2 },

  cardTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', color: '#fff', fontSize: 26, marginBottom: 4 },
  cardSubtitle: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,172,125,0.6)', fontSize: 14, marginBottom: 28 },

  errorBox: { backgroundColor: 'rgba(255,59,48,0.15)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(255,59,48,0.3)' },
  errorText: { fontFamily: 'Montserrat_500Medium', color: '#FF6B6B', fontSize: 13, textAlign: 'center' },

  inputLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  input: { height: 52, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, color: '#fff', fontFamily: 'Montserrat_400Regular', fontSize: 15, marginBottom: 16 },
  passwordWrap: { position: 'relative', marginBottom: 16 },
  eyeBtn: { position: 'absolute', right: 4, top: 6, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  bonusBadge: { backgroundColor: 'rgba(255,108,36,0.1)', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.2)' },
  bonusText: { fontFamily: 'Montserrat_500Medium', color: '#FFAC7D', fontSize: 13, textAlign: 'center' },

  submitBtn: { height: 52, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 30 },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 15 },
  spinner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' },

  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  loginText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  loginLink: { fontFamily: 'Montserrat_600SemiBold', color: '#FF6C24', fontSize: 13 },

  footerText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', marginTop: 32, lineHeight: 16 },
});

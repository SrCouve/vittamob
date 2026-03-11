import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Path, Polygon } from 'react-native-svg';
import { FONTS } from '../../src/constants/theme';

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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo + Tagline */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.logoSection}>
          <View style={styles.logoRow}>
            <Text style={styles.logoVitta}>VITTA</Text>
            <Text style={styles.logoUp}> UP</Text>
          </View>
          <Animated.Text entering={FadeIn.delay(300).duration(600)} style={styles.tagline}>
            Fitness · Wellness · Lifestyle
          </Animated.Text>
        </Animated.View>

        {/* Glass Login Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.cardSection}>
          {/* Card glow */}
          <View style={styles.cardGlow} />

          {/* Card */}
          <View style={styles.card}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
              style={StyleSheet.absoluteFill}
            />
            {/* Specular */}
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardSpecular}
            />

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Bem-vindo de volta</Text>
              <Text style={styles.cardSubtitle}>Entre na sua conta para continuar</Text>

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
                  style={[styles.input, { paddingRight: 48 }]}
                  placeholder="••••••••"
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

              {/* Forgot password */}
              <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLogin}
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
                    <Text style={styles.submitText}>Entrar</Text>
                    <ArrowRightIcon />
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU CONTINUE COM</Text>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)">
                    <Path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                  </Svg>
                  <Text style={styles.socialText}>Apple</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Svg width={17} height={17} viewBox="0 0 24 24">
                    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </Svg>
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Sign up link */}
        <Animated.View entering={FadeIn.delay(500).duration(600)} style={styles.signupRow}>
          <Text style={styles.signupText}>Não tem conta? </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.signupLink}>Criar conta grátis</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.Text entering={FadeIn.delay(700).duration(600)} style={styles.footerText}>
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },

  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoVitta: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 48, color: '#FF6C24', letterSpacing: -0.5 },
  logoUp: { fontFamily: 'Montserrat_300Light', fontSize: 48, color: '#fff', letterSpacing: -0.5 },
  tagline: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, letterSpacing: 1 },

  cardSection: { width: '100%', maxWidth: 400 },
  cardGlow: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: 28, backgroundColor: 'rgba(255,108,36,0.08)' },
  card: { borderRadius: 24, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 64 },
  cardSpecular: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, zIndex: 5 },
  cardContent: { padding: 28, zIndex: 2 },

  cardTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', color: '#fff', fontSize: 26, marginBottom: 4 },
  cardSubtitle: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 28 },

  inputLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  input: { height: 52, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, color: '#fff', fontFamily: 'Montserrat_400Regular', fontSize: 15, marginBottom: 16 },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 4, top: 6, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,172,125,0.7)', fontSize: 12 },

  submitBtn: { height: 52, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginTop: 4, shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 30 },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 15 },
  spinner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: 1 },

  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  socialText: { fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  signupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32 },
  signupText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  signupLink: { fontFamily: 'Montserrat_600SemiBold', color: '#FF6C24', fontSize: 13 },

  footerText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', marginTop: 32, lineHeight: 16 },
});

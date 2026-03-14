import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeInUp, FadeOutUp, FadeIn, useSharedValue, useAnimatedStyle,
  withTiming, withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';

const { width: SW, height: SH } = Dimensions.get('window');
const BG_IMAGE = require('../../assets/backvitta.png');

// ── Icons ──
function EyeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </Svg>
  );
}

function EyeOffIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <Path d="m1 1 22 22" />
    </Svg>
  );
}

// ── Liquid Glass CTA Button ──
function CTAButton({ onPress, isLoading, label }: { onPress: () => void; isLoading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.2);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255,255,255,${borderOpacity.value})`,
  }));

  return (
    <Animated.View style={[ctaStyles.outer, animStyle]}>
      {/* Ambient orange glow behind */}
      <View style={ctaStyles.ambientGlow} />

      <Animated.View style={[ctaStyles.btn, borderStyle]}>
        <TouchableOpacity
          style={ctaStyles.touchable}
          onPress={onPress}
          disabled={isLoading}
          activeOpacity={1}
          onPressIn={() => {
            scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
            borderOpacity.value = withTiming(0.4, { duration: 150 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 300 });
            borderOpacity.value = withTiming(0.2, { duration: 300 });
          }}
        >
          {/* Orange base with transparency for glass effect */}
          <LinearGradient
            colors={['rgba(255,108,36,0.6)', 'rgba(255,133,64,0.5)', 'rgba(255,108,36,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Blur layer — the liquid glass core */}
          <BlurView intensity={25} tint="default" style={StyleSheet.absoluteFill} />
          {/* Glass surface — white tint layer */}
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.0)', 'rgba(255,255,255,0.04)']}
            locations={[0, 0.3, 0.6, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Top specular highlight — the glass "rim" */}
          <LinearGradient
            colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.0)']}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ctaStyles.specularTop}
          />
          {/* Bottom warm glow */}
          <LinearGradient
            colors={['rgba(255,108,36,0.0)', 'rgba(255,108,36,0.15)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Inner border ring */}
          <View style={ctaStyles.innerBorder} />

          {isLoading ? (
            <View style={ctaStyles.spinner} />
          ) : (
            <View style={ctaStyles.content}>
              <Text style={ctaStyles.label}>{label}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12h14" />
                <Path d="m12 5 7 7-7 7" />
              </Svg>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const ctaStyles = StyleSheet.create({
  outer: { position: 'relative' },
  ambientGlow: {
    position: 'absolute', top: 4, left: 20, right: 20, bottom: -4,
    borderRadius: 25,
    backgroundColor: 'rgba(255,108,36,0.2)',
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24,
  },
  btn: {
    height: 52, borderRadius: 26, overflow: 'hidden',
    borderWidth: 0.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  touchable: {
    flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 26,
  },
  specularTop: {
    position: 'absolute', top: 0, left: 24, right: 24, height: 1, zIndex: 5,
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26, borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.25)',
    borderLeftColor: 'rgba(255,255,255,0.08)',
    borderRightColor: 'rgba(255,255,255,0.05)',
    borderBottomColor: 'transparent',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 2 },
  label: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 15, letterSpacing: 0.5 },
  spinner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', zIndex: 2 },
});

// ── Pressable Glass Pill (social buttons) ──
function GlassPill({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.12);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(255,255,255,${borderOpacity.value})`,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
    borderOpacity.value = withTiming(0.28, { duration: 150 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    borderOpacity.value = withTiming(0.12, { duration: 300 });
  };

  return (
    <Animated.View style={[styles.socialPill, animStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.socialPillTouchable}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 0.5 }}
        />
        <View style={styles.socialContent}>
          {children}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// ── Main Screen ──
// ══════════════════════════════════════
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithEmail, isLoading } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss error toast after 4 seconds
  useEffect(() => {
    if (errorMsg) {
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setErrorMsg(''), 4000);
    }
    return () => { if (errorTimer.current) clearTimeout(errorTimer.current); };
  }, [errorMsg]);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Preencha email e senha');
      return;
    }
    const { error } = await signInWithEmail(email.trim(), password);
    if (error) {
      setErrorMsg(error === 'Invalid login credentials' ? 'Email ou senha incorretos' : error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setErrorMsg('Não foi possível autenticar com Apple.');
        return;
      }

      // Apple only sends the name on FIRST sign-in, save it immediately
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Create/update profile with Apple name if available
      if (data.user && fullName) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: fullName,
          points_balance: 100,
        }, { onConflict: 'id', ignoreDuplicates: false });
      } else if (data.user) {
        // Ensure profile exists even without name
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: data.user.email?.split('@')[0] ?? 'Usuário',
          points_balance: 100,
        }, { onConflict: 'id', ignoreDuplicates: true });
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMsg('Erro ao entrar com Apple.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Full-screen background photo ── */}
      <Image source={BG_IMAGE} style={styles.bgImage} resizeMode="cover" />

      {/* ── Gradient overlay: transparent top → dark bottom ── */}
      <LinearGradient
        colors={[
          'rgba(13,13,13,0.0)',
          'rgba(13,13,13,0.0)',
          'rgba(13,13,13,0.15)',
          'rgba(13,13,13,0.35)',
          'rgba(13,13,13,0.5)',
          'rgba(13,13,13,0.6)',
        ]}
        locations={[0, 0.25, 0.4, 0.5, 0.6, 1]}
        style={styles.overlay}
        pointerEvents="none"
      />

      {/* ── Error toast — liquid glass orange, top of screen ── */}
      {errorMsg ? (
        <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(400)} style={[styles.errorToast, { top: insets.top + 12 }]}>
          <BlurView intensity={30} tint="default" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,108,36,0.5)', 'rgba(255,133,64,0.4)', 'rgba(255,108,36,0.45)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.0)']}
            locations={[0, 0.4, 1]}
            style={styles.errorShine}
          />
          <View style={styles.errorInnerBorder} />
          <LinearGradient
            colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.0)']}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.errorSpecular}
          />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </Animated.View>
      ) : null}

      {/* ── Logo floats over the photo ── */}
      <Animated.View entering={FadeIn.delay(100).duration(700)} style={[styles.logoWrap, { bottom: SH * 0.50 + 6 }]} pointerEvents="none">
        <View style={styles.logoRow}>
          <Text style={styles.logoVitta}>VITTA</Text>
          <Text style={styles.logoUp}>UP</Text>
        </View>
        <Animated.View entering={FadeIn.delay(400).duration(500)} style={styles.taglineRow}>
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineLine} />
          <Text style={styles.tagline}>Sua prática vale mais.</Text>
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineLine} />
        </Animated.View>
      </Animated.View>

      {/* ── Bottom sheet glass panel ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
      <Animated.View entering={FadeInUp.delay(200).duration(700)} style={styles.bottomSheet}>
        {/* Glass background layers */}
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)' }]} pointerEvents="none" />
        <LinearGradient
          colors={['rgba(255,200,160,0.04)', 'rgba(255,180,140,0.02)', 'rgba(255,160,120,0.03)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)']}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Top specular edge */}
        <LinearGradient
          colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.0)']}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sheetSpecular}
          pointerEvents="none"
        />
        {/* Top border line */}
        <View style={styles.sheetBorderTop} pointerEvents="none" />

        <ScrollView
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Drag indicator */}
          <View style={styles.dragIndicator} />



          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.fieldInput}
              placeholder="seu@email.com"
              placeholderTextColor="rgba(255,255,255,0.18)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Senha */}
          <Text style={styles.label}>Senha</Text>
          <View style={styles.field}>
            <TextInput
              style={[styles.fieldInput, { paddingRight: 50 }]}
              placeholder="Digite sua senha"
              placeholderTextColor="rgba(255,255,255,0.18)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.6}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity
            style={styles.forgotBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (!email) {
                Alert.alert('Insira seu email', 'Digite seu email para receber o link.');
                return;
              }
              useAuthStore.getState().resetPassword(email.trim()).then(({ error }) => {
                Alert.alert(error ? 'Erro' : 'Email enviado', error ?? 'Verifique sua caixa de entrada.');
              });
            }}
          >
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          {/* ── CTA Button ── */}
          <CTAButton onPress={handleLogin} isLoading={isLoading} label="Entrar" />

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
          </View>

          {/* ── Social label ── */}
          <Text style={styles.socialDividerText}>ou continue com</Text>

          {/* ── Social ── liquid glass pills */}
          <View style={styles.socialRow}>
            <GlassPill onPress={handleAppleSignIn}>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)">
                <Path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </Svg>
              <Text style={styles.socialLabel}>Apple</Text>
            </GlassPill>

            <GlassPill>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </Svg>
              <Text style={styles.socialLabel}>Google</Text>
            </GlassPill>
          </View>

          {/* ── Bottom links ── */}
          <View style={styles.bottomWrap}>
            <Text style={styles.bottomText}>Não tem conta? </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={styles.bottomLink}>Criar conta grátis</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
          </Text>
        </ScrollView>
      </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Background
  bgImage: { position: 'absolute', top: 0, left: 0, width: SW, height: SH },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Logo — absolute positioned over photo
  logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoVitta: {
    fontFamily: 'Montserrat_800ExtraBold', fontSize: 42, color: '#FFFFFF', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  logoUp: {
    fontFamily: 'Montserrat_300Light', fontSize: 42, color: '#FFFFFF', letterSpacing: 1, marginLeft: 4,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -4, paddingHorizontal: 40 },
  taglineLine: { flex: 1, height: 0.5 },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },

  // KeyboardAvoidingView wraps only the bottom sheet
  keyboardAvoid: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },

  // Bottom sheet — compact, glued to the bottom
  bottomSheet: {
    maxHeight: SH * 0.50,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  sheetSpecular: {
    position: 'absolute', top: 0, left: 32, right: 32, height: 1, zIndex: 10,
  },
  sheetBorderTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.18)', zIndex: 10,
  },
  sheetScroll: {
    paddingHorizontal: 24, paddingTop: 10,
  },
  dragIndicator: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 14,
  },

  // Error toast — liquid glass orange at top
  errorToast: {
    position: 'absolute', left: 20, right: 20, zIndex: 50,
    borderRadius: 20, overflow: 'hidden',
    paddingVertical: 14, paddingHorizontal: 20,
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  errorShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
  },
  errorInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20, borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderRightColor: 'rgba(255,255,255,0.05)',
    borderBottomColor: 'rgba(255,108,36,0.2)',
  },
  errorSpecular: {
    position: 'absolute', top: 0, left: 20, right: 20, height: 1, zIndex: 5,
  },
  errorText: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 13, textAlign: 'center', zIndex: 2 },

  // Fields — compact
  label: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 6, marginLeft: 4 },
  field: {
    height: 48, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 12, justifyContent: 'center',
  },
  fieldInput: { flex: 1, paddingHorizontal: 14, color: '#fff', fontFamily: 'Montserrat_400Regular', fontSize: 15 },
  eyeBtn: { position: 'absolute', right: 4, top: 3, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,172,125,0.75)', fontSize: 12 },

  // Divider
  dividerRow: { marginVertical: 8 },
  dividerLine: { height: 1, borderRadius: 1 },

  // Social divider text
  socialDividerText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.18)', fontSize: 11, textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },

  // Social — compact pills
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  socialPill: {
    height: 44, borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  socialPillTouchable: {
    flex: 1, paddingHorizontal: 20, justifyContent: 'center',
  },
  socialContent: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 2 },
  socialLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.75)', fontSize: 13 },

  // Bottom — tight
  bottomWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  bottomText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  bottomLink: { fontFamily: 'Montserrat_700Bold', color: '#FF8540', fontSize: 13 },
  legal: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 6, lineHeight: 15 },
});

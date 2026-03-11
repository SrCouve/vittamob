import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, RadialGradient, Stop, Rect, Circle as SvgCircle, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW - 48, 400);

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

// ── Animated Liquid Glass Button with Spinning Border ──
function SpinningButton({ onPress, isLoading, label }: { onPress: () => void; isLoading: boolean; label: string }) {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0.15);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3500, easing: Easing.linear }),
      -1, false,
    );
    pulse.value = withRepeat(
      withTiming(0.35, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: pulse.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const btnWidth = CARD_W - 56;
  const BTN_H = 56;
  const BORDER_R = 28;

  return (
    <Animated.View style={[spinStyles.outer, scaleStyle]}>
      {/* Pulsing ambient glow */}
      <Animated.View style={[spinStyles.glow, glowStyle]} />

      {/* Spinning gradient border */}
      <View style={[spinStyles.borderClip, { width: btnWidth, height: BTN_H, borderRadius: BORDER_R }]}>
        <Animated.View style={[spinStyles.spinLayer, spinStyle, { width: btnWidth * 2.5, height: btnWidth * 2.5 }]}>
          <LinearGradient
            colors={[
              'rgba(20,8,0,0.9)', '#CC5518', '#FF6C24', '#FF8540', '#FFAC7D',
              '#FF8540', '#FF6C24', '#CC5518', 'rgba(20,8,0,0.9)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* Inner liquid glass button */}
      <TouchableOpacity
        style={[spinStyles.innerBtn, { width: btnWidth - 4, height: BTN_H - 4, borderRadius: BORDER_R - 2 }]}
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={1}
        onPressIn={() => {
          btnScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          btnScale.value = withSpring(1, { damping: 12, stiffness: 300 });
        }}
      >
        {/* Dark base */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,6,0,0.75)', borderRadius: BORDER_R - 2 }]} />
        {/* Blur glass */}
        <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: BORDER_R - 2 }]} />
        {/* Glass surface gradient */}
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)', 'rgba(255,255,255,0.03)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BORDER_R - 2 }]}
        />
        {/* Orange inner glow — warm tint from below */}
        <LinearGradient
          colors={['rgba(255,108,36,0.0)', 'rgba(255,108,36,0.04)', 'rgba(255,108,36,0.08)']}
          locations={[0, 0.6, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: BORDER_R - 2 }]}
        />
        {/* Top specular edge */}
        <LinearGradient
          colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 0.5, zIndex: 5 }}
        />
        {/* Inner border */}
        <View style={[StyleSheet.absoluteFillObject, { borderRadius: BORDER_R - 2, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' }]} />

        {isLoading ? (
          <View style={spinStyles.spinner} />
        ) : (
          <View style={spinStyles.content}>
            <Text style={spinStyles.label}>{label}</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFAC7D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12h14" />
              <Path d="m12 5 7 7-7 7" />
            </Svg>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const spinStyles = StyleSheet.create({
  outer: { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 56 },
  glow: {
    position: 'absolute', top: 6, left: 16, right: 16, bottom: -2,
    borderRadius: 28, backgroundColor: 'rgba(255,108,36,0.12)',
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 }, shadowRadius: 24,
  },
  borderClip: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  spinLayer: { position: 'absolute' },
  innerBtn: { position: 'absolute', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 },
  label: {
    fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 15,
    letterSpacing: 0.8,
  },
  spinner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.12)', borderTopColor: '#FF8540', zIndex: 2 },
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

// ══════════════════════════════════════════════════════════
// ── Liquid Glass Card (inspired by rdev/liquid-glass-react)
// ══════════════════════════════════════════════════════════
// The web reference uses:
//   backdrop-filter: blur(6px) saturate(180%)
//   Two border layers (screen + overlay blend) with diagonal gradient
//   Inset box-shadow: 0.5px white + white glow + dark outer
//   Specular top highlight
//   Deep drop shadow
//
// React Native adaptation:
//   BlurView intensity 100 ≈ backdrop blur
//   Warm tint overlay ≈ saturate(180%)
//   SVG gradient border layers (screen/overlay simulated via opacity)
//   LinearGradient specular edges
//   Deep iOS shadows
// ══════════════════════════════════════════════════════════

function LiquidGlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={glass.outer}>
      {/* ── Layer 0: Deep shadow (box-shadow: 0px 12px 40px rgba(0,0,0,0.25)) ── */}
      <View style={glass.shadowLayer} />

      {/* ── Layer 1: Outer glow ring ── */}
      <View style={glass.outerGlow} />

      {/* ── Main glass body ── */}
      <View style={glass.body}>
        {/* Backdrop blur — equivalent to backdrop-filter: blur(Xpx) */}
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Saturation boost — simulates saturate(180%) with warm tint */}
        <LinearGradient
          colors={['rgba(255,200,160,0.03)', 'rgba(255,180,140,0.015)', 'rgba(255,160,120,0.02)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Glass surface — the main white tint layer */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.03)',
            'rgba(255,255,255,0.01)',
            'rgba(255,255,255,0.03)',
          ]}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Inner shadow — simulates inset box-shadow */}
        <LinearGradient
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.08)']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Border Layer 1 (screen blend simulation) ── */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.0)',
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.15)',
            'rgba(255,255,255,0.0)',
          ]}
          locations={[0, 0.33, 0.66, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={glass.borderScreen}
        />

        {/* ── Border Layer 2 (overlay blend simulation) ── */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.0)',
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.20)',
            'rgba(255,255,255,0.0)',
          ]}
          locations={[0, 0.33, 0.66, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={glass.borderOverlay}
        />

        {/* ── Top specular edge (the bright "glass rim") ──
            Ref: inset box-shadow: 0 0 0 0.5px white + top glow */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.0)',
            'rgba(255,255,255,0.10)',
            'rgba(255,255,255,0.18)',
            'rgba(255,255,255,0.10)',
            'rgba(255,255,255,0.0)',
          ]}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={glass.specularTop}
        />

        {/* ── Top glow spill ── */}
        <LinearGradient
          colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={glass.topGlowSpill}
        />

        {/* ── Left edge specular ── */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.0)',
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.10)',
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.0)',
          ]}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={glass.specularLeft}
        />

        {/* ── Bottom right subtle reflection ── */}
        <LinearGradient
          colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={glass.bottomReflection}
        />

        {/* ── Content ── */}
        <View style={glass.content}>
          {children}
        </View>
      </View>

      {/* ── Outer border ring (simulates the 0.5px inset white border) ── */}
      <View style={glass.outerBorderRing} pointerEvents="none" />
    </View>
  );
}

const glass = StyleSheet.create({
  outer: {
    width: '100%',
    maxWidth: 400,
  },
  shadowLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    backgroundColor: 'transparent',
  },
  outerGlow: {
    position: 'absolute',
    top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 30,
    // Subtle warm glow
    shadowColor: '#FF6C24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },
  body: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  // Border layer 1 — screen blend simulation (thin ring)
  borderScreen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'transparent',
    opacity: 0.2,
    zIndex: 5,
  },
  // Border layer 2 — overlay blend simulation
  borderOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'transparent',
    opacity: 0.15,
    zIndex: 6,
  },
  // Top specular — bright glass rim
  specularTop: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    zIndex: 10,
  },
  // Top glow spill from the specular
  topGlowSpill: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 40,
    zIndex: 8,
  },
  // Left specular edge
  specularLeft: {
    position: 'absolute',
    top: 28,
    bottom: 28,
    left: 0,
    width: 1,
    zIndex: 10,
  },
  // Bottom right reflection
  bottomReflection: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '50%',
    height: '30%',
    zIndex: 4,
  },
  content: {
    padding: 28,
    paddingTop: 30,
    zIndex: 20,
  },
  // Outer border ring — the visible white border
  outerBorderRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 30,
  },
});

// ══════════════════════════════════════
// ── Main Screen ──
// ══════════════════════════════════════
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signInWithEmail, isLoading } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');

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

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMsg('Erro ao entrar com Apple.');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* ── Ambient glow ── */}
      <View style={styles.ambientGlow} pointerEvents="none">
        <Svg width={SW} height={440}>
          <Defs>
            <RadialGradient id="glow1" cx="50%" cy="35%" rx="55%" ry="55%">
              <Stop offset="0" stopColor="#FF6C24" stopOpacity="0.30" />
              <Stop offset="0.5" stopColor="#FF8540" stopOpacity="0.10" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <SvgCircle cx={SW / 2} cy={155} r={220} fill="url(#glow1)" />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ── */}
        <Animated.View entering={FadeInDown.delay(50).duration(700)} style={styles.logoWrap}>
          <View style={styles.logoRow}>
            <Text style={styles.logoVitta}>VITTA</Text>
            <Text style={styles.logoUp}> UP</Text>
          </View>
          <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.taglineRow}>
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineLine} />
            <Text style={styles.tagline}>Sua prática vale mais.</Text>
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineLine} />
          </Animated.View>
        </Animated.View>

        {/* ══════════════════════════════════════ */}
        {/* ── Liquid Glass Card ── */}
        {/* ══════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(150).duration(700)}>
          <LiquidGlassCard>
            {errorMsg ? (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBar}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(255,80,50,0.12)', 'rgba(255,60,40,0.06)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.errorDot} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.field, focusedField === 'email' && styles.fieldFocused]}>
              <TextInput
                style={styles.fieldInput}
                placeholder="seu@email.com"
                placeholderTextColor="rgba(255,255,255,0.18)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Senha */}
            <Text style={styles.label}>Senha</Text>
            <View style={[styles.field, focusedField === 'password' && styles.fieldFocused]}>
              <TextInput
                style={[styles.fieldInput, { paddingRight: 50 }]}
                placeholder="Digite sua senha"
                placeholderTextColor="rgba(255,255,255,0.18)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
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

            {/* ── Spinning Gradient Border Button ── */}
            <SpinningButton onPress={handleLogin} isLoading={isLoading} label="Entrar" />

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
          </LiquidGlassCard>
        </Animated.View>

        {/* ── Bottom ── */}
        <Animated.View entering={FadeIn.delay(550).duration(600)} style={styles.bottomWrap}>
          <Text style={styles.bottomText}>Não tem conta? </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(auth)/signup' as any)}>
            <Text style={styles.bottomLink}>Criar conta grátis</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(700).duration(500)} style={styles.legal}>
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlow: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 },

  scrollContent: {
    flexGrow: 1, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },

  // Logo — matches PDF exactly: VITTA bold orange, UP light white, no effects
  logoWrap: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoVitta: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 42, color: '#FF6C24', letterSpacing: 2 },
  logoUp: { fontFamily: 'Montserrat_300Light', fontSize: 42, color: '#FFFFFF', letterSpacing: 2 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  taglineLine: { flex: 1, height: 0.5 },
  tagline: { fontFamily: 'PlayfairDisplay_400Regular', color: 'rgba(255,255,255,0.25)', fontSize: 13, fontStyle: 'italic' },

  // Error — integrated glass bar
  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, marginBottom: 22,
    borderWidth: 0.5, borderColor: 'rgba(255,100,60,0.15)',
    overflow: 'hidden',
  },
  errorDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6C24',
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6,
  },
  errorText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,180,140,0.85)', fontSize: 13, flex: 1 },

  // Fields
  label: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 8, marginLeft: 4 },
  field: {
    height: 52, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20, justifyContent: 'center',
  },
  fieldFocused: {
    borderColor: 'rgba(255,108,36,0.4)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 12,
  },
  fieldInput: { flex: 1, paddingHorizontal: 16, color: '#fff', fontFamily: 'Montserrat_400Regular', fontSize: 15 },
  eyeBtn: { position: 'absolute', right: 4, top: 5, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,172,125,0.75)', fontSize: 12 },

  // Divider
  dividerRow: { marginVertical: 24 },
  dividerLine: { height: 1, borderRadius: 1 },

  // Social divider text
  socialDividerText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.18)', fontSize: 12, textAlign: 'center', marginBottom: 16, letterSpacing: 0.5 },

  // Social — liquid glass pills
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  socialPill: {
    height: 48, borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  socialPillTouchable: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'center',
  },
  socialContent: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 2 },
  socialLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.75)', fontSize: 14 },

  // Bottom
  bottomWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  bottomText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  bottomLink: { fontFamily: 'Montserrat_700Bold', color: '#FF8540', fontSize: 14 },
  legal: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 17, paddingHorizontal: 20 },
});

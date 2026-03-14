import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect, Line as SvgLine } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const THUNDER_ANIM = require('../../assets/thunder-energia.json');
const AnimatedView = Animated.View;

interface SplashTransitionProps {
  onFinish: () => void;
}

export function SplashTransition({ onFinish }: SplashTransitionProps) {
  const thunderRef = useRef<LottieView>(null);

  // ── Horizontal light lines (sweep in from edges) ──
  const lineLeftX = useSharedValue(-SW);
  const lineRightX = useSharedValue(SW);
  const linesOpacity = useSharedValue(0);

  // ── Center flash on collision ──
  const flashScale = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  // ── Warm ambient (after flash) ──
  const ambientOpacity = useSharedValue(0);

  // ── Logo ──
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  // Individual letter stagger
  const letterOpacities = [
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), // V I T T A
    useSharedValue(0), useSharedValue(0), // U P
  ];
  const letterYs = [
    useSharedValue(20), useSharedValue(20), useSharedValue(20), useSharedValue(20), useSharedValue(20),
    useSharedValue(20), useSharedValue(20),
  ];

  // ── Shimmer sweep across logo (specular highlight) ──
  const shimmerX = useSharedValue(-SW);

  // ── Tagline ──
  const taglineOpacity = useSharedValue(0);
  const taglineLineW = useSharedValue(0);

  // ── Thunder ──
  const thunderOpacity = useSharedValue(0);
  const thunderScale = useSharedValue(0);

  // ── Glass card behind logo ──
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);

  // ── Exit ──
  const exitOpacity = useSharedValue(1);

  const letters = ['V', 'I', 'T', 'T', 'A', 'U', 'P'];

  useEffect(() => {
    const e = Easing;

    // ── Phase 1: Light lines sweep to center (0ms) ──
    linesOpacity.value = withTiming(1, { duration: 200 });
    lineLeftX.value = withTiming(0, { duration: 700, easing: e.out(e.cubic) });
    lineRightX.value = withTiming(0, { duration: 700, easing: e.out(e.cubic) });

    // ── Phase 2: Flash on collision (650ms) ──
    flashScale.value = withDelay(600, withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(2, { duration: 300, easing: e.out(e.cubic) }),
    ));
    flashOpacity.value = withDelay(600, withSequence(
      withTiming(0.9, { duration: 80 }),
      withTiming(0, { duration: 400 }),
    ));

    // Lines fade after collision
    linesOpacity.value = withDelay(700, withTiming(0, { duration: 300 }));

    // ── Phase 3: Ambient warm glow (700ms) ──
    ambientOpacity.value = withDelay(700, withTiming(1, { duration: 800, easing: e.out(e.quad) }));

    // ── Phase 4: Glass card + logo (800ms) ──
    cardOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    cardScale.value = withDelay(800, withSpring(1, { damping: 16, stiffness: 120 }));
    logoOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
    logoScale.value = withDelay(800, withSpring(1, { damping: 14, stiffness: 100 }));

    // ── Phase 5: Letter stagger reveal (900ms) ──
    letters.forEach((_, i) => {
      const delay = 900 + i * 60;
      letterOpacities[i].value = withDelay(delay, withTiming(1, { duration: 250 }));
      letterYs[i].value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 150 }));
    });

    // ── Phase 6: Shimmer sweep (1400ms) ──
    shimmerX.value = withDelay(1400, withTiming(SW * 1.5, {
      duration: 800,
      easing: e.inOut(e.cubic),
    }));

    // ── Phase 7: Thunder + tagline (1500ms) ──
    thunderOpacity.value = withDelay(1500, withTiming(1, { duration: 200 }));
    thunderScale.value = withDelay(1500, withSpring(1, { damping: 8, stiffness: 200 }));
    setTimeout(() => thunderRef.current?.play(), 1550);

    taglineLineW.value = withDelay(1600, withTiming(1, { duration: 500, easing: e.out(e.cubic) }));
    taglineOpacity.value = withDelay(1750, withTiming(1, { duration: 400 }));

    // Second shimmer sweep (2100ms)
    shimmerX.value = withDelay(2100, withSequence(
      withTiming(-SW, { duration: 0 }),
      withTiming(SW * 1.5, { duration: 700, easing: e.inOut(e.cubic) }),
    ));

    // ── Exit (2800ms) ──
    exitOpacity.value = withDelay(2800, withTiming(0, {
      duration: 600,
      easing: e.in(e.cubic),
    }, () => {
      runOnJS(onFinish)();
    }));
  }, []);

  // ── Styles ──
  const lineLeftStyle = useAnimatedStyle(() => ({
    opacity: linesOpacity.value,
    transform: [{ translateX: lineLeftX.value }],
  }));

  const lineRightStyle = useAnimatedStyle(() => ({
    opacity: linesOpacity.value,
    transform: [{ translateX: lineRightX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }],
  }));

  const ambientStyle = useAnimatedStyle(() => ({ opacity: ambientOpacity.value }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const logoContainerStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const makeLetterStyle = (i: number) =>
    useAnimatedStyle(() => ({
      opacity: letterOpacities[i].value,
      transform: [{ translateY: letterYs[i].value }],
    }));

  const letterStyles = letters.map((_, i) => makeLetterStyle(i));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const thunderAnimStyle = useAnimatedStyle(() => ({
    opacity: thunderOpacity.value,
    transform: [{ scale: thunderScale.value }],
  }));

  const taglineLineStyle = useAnimatedStyle(() => ({
    width: interpolate(taglineLineW.value, [0, 1], [0, 140]),
    opacity: interpolate(taglineLineW.value, [0, 0.05, 1], [0, 1, 1]),
  }));

  const taglineTextStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  const containerStyle = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Pure black base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050505' }]} />

      {/* Warm ambient gradient (appears after flash) */}
      <Animated.View style={[StyleSheet.absoluteFill, ambientStyle]}>
        <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="sg1" cx="50%" cy="42%" r="55%">
              <Stop offset="0%" stopColor="#FF6C24" stopOpacity="0.10" />
              <Stop offset="40%" stopColor="#FF6C24" stopOpacity="0.04" />
              <Stop offset="100%" stopColor="#FF6C24" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="sg2" cx="65%" cy="55%" r="35%">
              <Stop offset="0%" stopColor="#FFAC7D" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#FFAC7D" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={SW} height={SH} fill="url(#sg1)" />
          <Rect x="0" y="0" width={SW} height={SH} fill="url(#sg2)" />
        </Svg>
      </Animated.View>

      {/* ── Horizontal light lines ── */}
      <AnimatedView style={[styles.lightLine, styles.lightLineLeft, lineLeftStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,108,36,0.6)', '#FF6C24', 'rgba(255,108,36,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.lightLineGradient}
        />
      </AnimatedView>
      <AnimatedView style={[styles.lightLine, styles.lightLineRight, lineRightStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,108,36,0.6)', '#FF6C24', 'rgba(255,108,36,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.lightLineGradient}
        />
      </AnimatedView>

      {/* ── Flash on collision ── */}
      <AnimatedView style={[styles.flash, flashStyle]}>
        <LinearGradient
          colors={['#FF6C24', 'rgba(255,108,36,0.4)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 0 }}
        />
      </AnimatedView>

      {/* ── Glass card behind content ── */}
      <AnimatedView style={[styles.glassCard, cardStyle]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.03)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Top specular */}
        <LinearGradient
          colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glassSpecular}
        />
        <View style={styles.glassInnerBorder} />
      </AnimatedView>

      {/* ── Center content ── */}
      <View style={styles.center}>
        {/* Thunder above */}
        <AnimatedView style={[styles.thunderWrap, thunderAnimStyle]}>
          <LottieView
            ref={thunderRef}
            source={THUNDER_ANIM}
            loop={false}
            speed={0.6}
            style={styles.thunderLottie}
          />
        </AnimatedView>

        {/* Logo with staggered letters */}
        <AnimatedView style={[styles.logoWrap, logoContainerStyle]}>
          <View style={styles.logoRow}>
            {letters.map((letter, i) => (
              <Animated.Text
                key={i}
                style={[i < 5 ? styles.logoVitta : styles.logoUp, letterStyles[i]]}
              >
                {letter}
              </Animated.Text>
            ))}
          </View>

          {/* Shimmer overlay (sweeps across logo) */}
          <AnimatedView style={[styles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={[
                'transparent',
                'rgba(255,255,255,0.0)',
                'rgba(255,255,255,0.15)',
                'rgba(255,200,160,0.25)',
                'rgba(255,255,255,0.15)',
                'rgba(255,255,255,0.0)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </AnimatedView>
        </AnimatedView>

        {/* Tagline with animated line */}
        <View style={styles.taglineSection}>
          <AnimatedView style={[styles.taglineLine, taglineLineStyle]} />
          <Animated.Text style={[styles.tagline, taglineTextStyle]}>
            Sua prática vale mais.
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Light lines
  lightLine: {
    position: 'absolute',
    height: 1,
    width: SW,
    top: SH * 0.48,
  },
  lightLineLeft: { right: SW * 0.5 },
  lightLineRight: { left: SW * 0.5 },
  lightLineGradient: { flex: 1 },

  // Flash
  flash: {
    position: 'absolute',
    width: SW,
    height: SW,
    borderRadius: SW * 0.5,
  },

  // Glass card
  glassCard: {
    position: 'absolute',
    width: SW * 0.75,
    height: 200,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glassSpecular: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: 1,
  },
  glassInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderLeftColor: 'rgba(255,255,255,0.04)',
    borderRightColor: 'rgba(255,255,255,0.03)',
    borderBottomColor: 'transparent',
  },

  // Content
  center: {
    alignItems: 'center',
    zIndex: 5,
  },
  thunderWrap: {
    marginBottom: 2,
  },
  thunderLottie: {
    width: 56,
    height: 56,
  },

  // Logo
  logoWrap: {
    overflow: 'hidden',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoVitta: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 50,
    color: '#FF6C24',
    letterSpacing: 4,
  },
  logoUp: {
    fontFamily: 'Montserrat_300Light',
    fontSize: 50,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 4,
    marginLeft: 2,
  },

  // Shimmer
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 120,
  },
  shimmerGradient: {
    flex: 1,
  },

  // Tagline
  taglineSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  taglineLine: {
    height: 0.5,
    backgroundColor: 'rgba(255,108,36,0.35)',
    marginBottom: 14,
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
});

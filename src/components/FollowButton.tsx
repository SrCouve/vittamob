import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator, Platform,
  Dimensions, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, Easing, useDerivedValue,
  useAnimatedReaction, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import LottieView from 'lottie-react-native';

let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

const hapticImpact = (style: any) => {
  try { Haptics?.impactAsync(style); } catch {}
};
const hapticNotify = (type: any) => {
  try { Haptics?.notificationAsync(type); } catch {}
};

let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {}

const THUNDER_ANIM = require('../../assets/thunder-energia.json');
const RUNNING_ANIM = require('../../assets/running-dark.json');
const FIST_BUMP_ANIM = require('../../assets/fist-bump.json');
const SOUND_CHARGING = require('../../assets/sounds/spark-charging.wav');
const SOUND_RELEASE = require('../../assets/sounds/spark-release.wav');

const CHARGE_MS = 2000; // 2 seconds for the runner to complete 1km

// ── Types ──

interface RelationshipStatus {
  i_follow: boolean;
  they_follow: boolean;
  is_mutual: boolean;
  is_blocked: boolean;
  i_requested: boolean;
  they_requested: boolean;
}

interface FollowButtonProps {
  relationship: RelationshipStatus;
  isLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onCancelRequest?: () => void;
  size?: 'small' | 'medium';
}

// ── Icons ──

function SparkIcon({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={1.5}>
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

function ClockIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

// ── Spark Particles ──

function SparkParticle({ index, playing }: { index: number; playing: boolean }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const s = useSharedValue(0);

  useEffect(() => {
    if (playing) {
      const angle = (index * 36) * (Math.PI / 180);
      const dist = 45 + Math.random() * 35;
      const d = index * 15;
      opacity.value = withDelay(d, withSequence(withTiming(1, { duration: 60 }), withDelay(400, withTiming(0, { duration: 500 }))));
      tx.value = withDelay(d, withTiming(Math.cos(angle) * dist, { duration: 700, easing: Easing.out(Easing.cubic) }));
      ty.value = withDelay(d, withTiming(Math.sin(angle) * dist, { duration: 700, easing: Easing.out(Easing.cubic) }));
      s.value = withDelay(d, withSequence(withTiming(1.8, { duration: 80 }), withTiming(0, { duration: 600 })));
    } else {
      opacity.value = 0; tx.value = 0; ty.value = 0; s.value = 0;
    }
  }, [playing]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: s.value }],
  }));

  return (
    <Animated.View style={[styles.particle, style]}>
      <SparkIcon size={10} color={index % 2 === 0 ? '#FF6C24' : '#FFAC7D'} />
    </Animated.View>
  );
}

// ── State ──

type BtnState = 'apoiar' | 'apoiar_volta' | 'requested' | 'apoiando' | 'parceiros';

function deriveState(r: RelationshipStatus): BtnState {
  if (r.is_mutual) return 'parceiros';
  if (r.i_follow) return 'apoiando';
  if (r.i_requested) return 'requested';
  if (r.they_follow && !r.i_follow) return 'apoiar_volta';
  return 'apoiar';
}

const SIZES = {
  small: { h: 36, px: 16, fs: 11, icon: 11 },
  medium: { h: 48, px: 22, fs: 13, icon: 13 },
} as const;

// ══════════════════════════════════════
export function FollowButton({ relationship, isLoading, onFollow, onUnfollow, onCancelRequest, size = 'medium' }: FollowButtonProps) {
  const cfg = SIZES[size];
  const state = deriveState(relationship);
  const isOrange = state === 'apoiar' || state === 'apoiar_volta';

  // Animation values
  const scale = useSharedValue(1);
  const widthExpand = useSharedValue(0); // 0 to 1 (button gets wider)
  const progress = useSharedValue(0); // 0 to 1
  const glowIntensity = useSharedValue(0);
  const whiteFlash = useSharedValue(0);
  const isHolding = useRef(false);

  // KM counter display
  const [kmDisplay, setKmDisplay] = useState('0.0');
  const [isCharging, setIsCharging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Refs
  const chargeTimer = useRef<NodeJS.Timeout | null>(null);
  const vibTimer = useRef<NodeJS.Timeout | null>(null);
  const particleTimer = useRef<NodeJS.Timeout | null>(null);
  const followTimer = useRef<NodeJS.Timeout | null>(null);
  const chargingSound = useRef<any>(null);
  const lottieRef = useRef<LottieView>(null);
  const runnerRef = useRef<LottieView>(null);

  useEffect(() => {
    return () => {
      chargingSound.current?.unloadAsync();
      if (particleTimer.current) clearTimeout(particleTimer.current);
      if (followTimer.current) clearTimeout(followTimer.current);
      if (chargeTimer.current) clearTimeout(chargeTimer.current);
      if (vibTimer.current) clearTimeout(vibTimer.current);
    };
  }, []);

  // Reset completed state when relationship changes
  useEffect(() => {
    setIsCompleted(false);
  }, [state]);

  // Update km display from progress (on JS thread)
  const updateKm = useCallback((val: number) => {
    setKmDisplay((val).toFixed(1));
  }, []);

  useAnimatedReaction(
    () => progress.value,
    (val) => {
      runOnJS(updateKm)(val);
    },
    [progress]
  );

  // ── Animated styles ──
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Runner position: moves from left (0%) to right (100%) of button
  const runnerStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 85}%` as any, // 0% to 85% (so runner doesn't go off edge)
    opacity: progress.value > 0 ? 1 : 0,
  }));

  // Fill track behind runner
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
    opacity: progress.value > 0 ? 1 : 0,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: whiteFlash.value,
    transform: [{ scale: 1 + whiteFlash.value * 3 }],
  }));

  // ── Sound ──
  const playRelease = async () => {
    if (!Audio) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_RELEASE);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync(); });
    } catch {}
  };

  const startChargeSound = async () => {
    if (!Audio) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_CHARGING);
      chargingSound.current = sound;
      await sound.playAsync();
    } catch {}
  };

  const stopChargeSound = async () => {
    try {
      await chargingSound.current?.stopAsync();
      await chargingSound.current?.unloadAsync();
      chargingSound.current = null;
    } catch {}
  };

  // ── Vibration (accelerating ticks) ──
  const startVibration = () => {
    let count = 0;
    const vib = () => {
      count++;
      const p = Math.min(count / (CHARGE_MS / 100), 1);
      const interval = Math.max(50, 160 - p * 110);

      if (Platform.OS !== 'web' && Haptics) {
        if (p > 0.8) hapticImpact(Haptics?.ImpactFeedbackStyle?.Heavy);
        else if (p > 0.5) hapticImpact(Haptics?.ImpactFeedbackStyle?.Medium);
        else hapticImpact(Haptics?.ImpactFeedbackStyle?.Light);
      }

      vibTimer.current = setTimeout(vib, interval);
    };
    vibTimer.current = setTimeout(vib, 160);
  };

  // ── Start ──
  const startCharging = () => {
    if (isLoading || !isOrange || isHolding.current) return;
    isHolding.current = true;
    setIsCharging(true);
    setKmDisplay('0.0');

    // Force runner Lottie to play (autoPlay doesn't work on all devices)
    setTimeout(() => {
      runnerRef.current?.reset();
      runnerRef.current?.play();
    }, 50);

    scale.value = withTiming(0.97, { duration: 150 });
    progress.value = withTiming(1, {
      duration: CHARGE_MS,
      easing: Easing.linear,
    });

    glowIntensity.value = withTiming(0.5, { duration: CHARGE_MS, easing: Easing.out(Easing.quad) });

    startChargeSound();
    startVibration();

    chargeTimer.current = setTimeout(completeCharge, CHARGE_MS);
  };

  // ── Cancel ──
  const cancelCharging = () => {
    if (!isHolding.current) return;
    isHolding.current = false;
    setIsCharging(false);

    if (chargeTimer.current) { clearTimeout(chargeTimer.current); chargeTimer.current = null; }
    if (vibTimer.current) { clearTimeout(vibTimer.current); vibTimer.current = null; }
    stopChargeSound();

    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    progress.value = withTiming(0, { duration: 150 });
    glowIntensity.value = withTiming(0, { duration: 150 });
    setKmDisplay('0.0');
  };

  // ── Complete ──
  const completeCharge = useCallback(() => {
    isHolding.current = false;
    setIsCharging(false);
    setIsCompleted(true);
    if (vibTimer.current) clearTimeout(vibTimer.current);
    stopChargeSound();
    playRelease();

    setKmDisplay('1.0');

    // Circular wave — starts strong, expands and fades
    whiteFlash.value = withSequence(
      withTiming(0.6, { duration: 50 }),
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Scale — gentle bounce
    scale.value = withSequence(
      withTiming(1.04, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 18, stiffness: 120 }),
    );

    // Reset progress smoothly
    progress.value = withDelay(300, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));

    // Glow fades out very slowly
    glowIntensity.value = withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) });

    // Particles — longer duration
    setShowParticles(true);
    particleTimer.current = setTimeout(() => setShowParticles(false), 1200);

    // Lottie thunder
    lottieRef.current?.reset();
    lottieRef.current?.play();

    // Haptic — heavy then success with more space
    if (Platform.OS !== 'web' && Haptics) {
      hapticImpact(Haptics?.ImpactFeedbackStyle?.Heavy);
      setTimeout(() => hapticNotify(Haptics?.NotificationFeedbackType?.Success), 200);
    }

    // Longer delay before follow — let the animation breathe
    followTimer.current = setTimeout(() => onFollow(), 800);
  }, [onFollow]);

  // ── Tap for non-apoiar states ──
  const handleTap = useCallback(() => {
    if (isLoading) return;
    if (Platform.OS !== 'web' && Haptics) hapticImpact(Haptics?.ImpactFeedbackStyle?.Medium);

    if (state === 'requested') {
      Alert.alert('Cancelar solicitacao?', 'A solicitacao sera cancelada.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar', onPress: onCancelRequest ?? onUnfollow, style: 'destructive' },
      ]);
    } else {
      Alert.alert('Deixar de apoiar?', 'Voce deixara de apoiar este usuario.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: onUnfollow, style: 'destructive' },
      ]);
    }
  }, [state, isLoading, onUnfollow, onCancelRequest]);

  // ── Render ──
  const isParceiros = state === 'parceiros';
  const isRequested = state === 'requested';

  const btnStyle = [
    styles.btn,
    { height: cfg.h, paddingHorizontal: cfg.px, borderRadius: cfg.h / 2 },
    isParceiros && styles.parceirosBtn,
    (isRequested || state === 'apoiando') && styles.glassBtn,
    isOrange && styles.orangeShadow,
    isCharging && { width: '100%' as any },
  ];

  // ── Non-charging content for apoiar states ──
  const renderIdleContent = () => (
    <View style={styles.content}>
      <SparkIcon size={cfg.icon} color="#fff" />
      <Text style={[styles.label, { fontSize: cfg.fs }]}>
        {state === 'apoiar_volta' ? 'Segurar pra apoiar de volta' : 'Segurar pra apoiar'}
      </Text>
      <View style={styles.costBadge}>
        <Text style={styles.costText}>1 spark</Text>
      </View>
    </View>
  );

  // ── Charging content: runner + km counter ──
  const renderChargingContent = () => (
    <>
      {/* Runner Lottie moving across the button */}
      <Animated.View style={[styles.runner, runnerStyle]}>
        <LottieView
          ref={runnerRef}
          source={RUNNING_ANIM}
          autoPlay={true}
          loop={true}
          speed={2.5}
          renderMode="AUTOMATIC"
          style={styles.runnerLottie}
        />
      </Animated.View>

      {/* KM counter centered */}
      <View style={styles.content}>
        <SparkIcon size={cfg.icon + 2} color="#fff" />
        <Text style={[styles.kmCounter, { fontSize: cfg.fs + 6 }]}>
          {kmDisplay}
        </Text>
        <Text style={[styles.kmUnit, { fontSize: cfg.fs - 2 }]}>km</Text>
      </View>
    </>
  );

  // ── Other states content ──
  const renderOtherContent = () => {
    if (isLoading) return <ActivityIndicator color={isParceiros ? '#FF6C24' : '#fff'} size="small" />;

    if (state === 'parceiros') {
      return (
        <View style={styles.content}>
          <View style={{ width: 24, height: 24, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
            <LottieView
              source={FIST_BUMP_ANIM}
              autoPlay
              loop
              speed={0.8}
              style={{ width: 40, height: 40, marginTop: -10 }}
            />
          </View>
          <Text style={[styles.label, styles.parceirosLabel, { fontSize: cfg.fs }]}>Parceiros</Text>
        </View>
      );
    }

    const label =
      state === 'requested' ? 'Solicitado' : 'Apoiando';

    const icon =
      state === 'requested' ? <ClockIcon size={cfg.icon} /> :
      <SparkIcon size={cfg.icon} color="rgba(255,255,255,0.7)" />;

    return (
      <View style={styles.content}>
        {icon}
        <Text style={[
          styles.label,
          { fontSize: cfg.fs },
          isRequested && { color: 'rgba(255,255,255,0.6)' },
        ]}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      {/* Particles */}
      {showParticles && (
        <View style={styles.particlesWrap} pointerEvents="none">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <SparkParticle key={i} index={i} playing={showParticles} />
          ))}
        </View>
      )}

      {/* Glow */}
      {isOrange && (
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      )}

      {/* Thunder Lottie */}
      {showParticles && (
        <View style={styles.lottie} pointerEvents="none">
          <LottieView ref={lottieRef} source={THUNDER_ANIM} autoPlay loop={false} speed={1.2} style={{ width: 90, height: 90 }} />
        </View>
      )}

      {/* White flash */}
      <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />

      <Animated.View style={scaleStyle}>
        {isOrange ? (
          <Pressable
            onPressIn={startCharging}
            onPressOut={cancelCharging}
            style={btnStyle}
          >
            <LinearGradient
              colors={['#FF6C24', '#FF8540']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 9999 }]}
            />
            {isCharging ? renderChargingContent() : isCompleted ? null : renderIdleContent()}
          </Pressable>
        ) : (
          <Pressable onPress={handleTap} style={btnStyle}>
            {renderOtherContent()}
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderRadius: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 5,
  },
  glassBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  parceirosBtn: {
    backgroundColor: 'rgba(255,108,36,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.20)',
  },
  orangeShadow: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#FF6C24',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  label: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
  },
  parceirosLabel: {
    color: '#FF6C24',
  },
  costBadge: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 2,
  },
  costText: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    fontSize: 10,
  },
  // Charge fill track
  chargeFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 9999,
    zIndex: 1,
  },
  // Runner
  runner: {
    position: 'absolute',
    top: -18,
    zIndex: 4,
  },
  runnerLottie: {
    width: 65,
    height: 65,
  },
  // KM counter
  kmCounter: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#fff',
    includeFontPadding: false,
  },
  kmUnit: {
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
    marginLeft: -2,
  },
  // Flash
  flashOverlay: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,172,125,0.5)',
    zIndex: 30,
  },
  // Glow
  glow: {
    position: 'absolute',
    width: '110%',
    height: '160%',
    borderRadius: 100,
    backgroundColor: 'rgba(255,108,36,0.2)',
    zIndex: -1,
  },
  // Lottie thunder
  lottie: {
    position: 'absolute',
    zIndex: 25,
    width: 90,
    height: 90,
  },
  // Particles
  particlesWrap: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  particle: {
    position: 'absolute',
  },
});

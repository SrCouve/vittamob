import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';

const isWeb = Platform.OS === 'web';
const THUNDER = require('../../assets/thunder-energia.json');
const CELEBRATION = require('../../assets/celebration.json');

interface SparkClaimModalProps {
  visible: boolean;
  sparksCount: number;
  runsCount: number;
  onClaim: () => void;
}

export function SparkClaimModal({ visible, sparksCount, runsCount, onClaim }: SparkClaimModalProps) {
  const [counter, setCounter] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const thunderRef = useRef<any>(null);

  // Animate counter up
  useEffect(() => {
    if (!visible) { setCounter(0); setClaimed(false); return; }
    if (sparksCount <= 0) return;

    let current = 0;
    const step = Math.max(1, Math.floor(sparksCount / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= sparksCount) {
        current = sparksCount;
        clearInterval(interval);
      }
      setCounter(current);
    }, 30);
    return () => clearInterval(interval);
  }, [visible, sparksCount]);

  // Thunder animation on mount
  useEffect(() => {
    if (visible) {
      setTimeout(() => thunderRef.current?.play(), 200);
    }
  }, [visible]);

  const handleClaim = () => {
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimed(true);
    setTimeout(() => onClaim(), 2500);
  };

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={s.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClaim} />
      {!isWeb && <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />}

      <Animated.View entering={FadeInDown.delay(100).duration(500).springify().damping(16)} style={s.card}>
        {!isWeb && <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient
          colors={['rgba(255,108,36,0.1)', 'rgba(255,133,64,0.04)', 'rgba(255,108,36,0.06)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,180,130,0.25)' }} />

        {/* Celebration overlay — fades in smoothly */}
        {claimed && (
          <Animated.View entering={FadeIn.delay(200).duration(600)} style={s.celebrationWrap}>
            <LottieView source={CELEBRATION} autoPlay loop={false} speed={0.8} style={s.celebration} />
          </Animated.View>
        )}

        {/* Thunder icon */}
        <View style={s.iconWrap}>
          <LottieView ref={thunderRef} source={THUNDER} autoPlay={false} loop={false} speed={0.8} style={{ width: 80, height: 80 }} />
        </View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={s.title}>
            {runsCount === 1 ? 'Você correu!' : `${runsCount} corridas novas!`}
          </Text>
        </Animated.View>

        {/* Counter */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={s.counterWrap}>
          <Text style={s.counterPlus}>+</Text>
          <Text style={[s.counterValue, claimed && { color: '#4CAF50' }]}>{counter}</Text>
          <View style={s.counterLabel}>
            <LottieView source={THUNDER} autoPlay loop={false} style={{ width: 18, height: 18 }} />
            <Text style={s.counterLabelText}>sparks</Text>
          </View>
        </Animated.View>

        {/* Sub */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <Text style={s.sub}>
            {claimed
              ? 'Sparks resgatados!'
              : `Desde sua última visita`
            }
          </Text>
        </Animated.View>

        {/* Button */}
        {!claimed ? (
          <Animated.View entering={FadeInUp.delay(800).duration(400)} style={{ width: '100%' }}>
            <TouchableOpacity style={s.claimBtn} activeOpacity={0.85} onPress={handleClaim}>
              {!isWeb && <BlurView intensity={25} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 27 }]} />}
              <Text style={s.claimBtnText}>Resgatar sparks</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(400).duration(500)}>
            <Text style={s.claimedText}>Bora pra próxima!</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isWeb ? 'rgba(0,0,0,0.7)' : 'transparent',
  },
  card: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,108,36,0.2)',
  },
  celebrationWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as any,
  },
  celebration: {
    width: 340,
    height: 340,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  counterWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  counterPlus: {
    fontFamily: 'Montserrat_300Light',
    fontSize: 28,
    color: '#FF6C24',
    marginRight: 2,
  },
  counterValue: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 48,
    color: '#FF6C24',
  },
  counterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    marginBottom: 6,
  },
  counterLabelText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  sub: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: 24,
  },
  claimBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,108,36,0.25)',
    backgroundColor: isWeb ? 'rgba(255,255,255,0.06)' : 'transparent',
  },
  claimBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#FF6C24',
  },
  claimedText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
});

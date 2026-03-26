import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// ── #1 Gold ──
export function RankOneBadge() {
  const shimmerX = useSharedValue(-1.5);

  useEffect(() => {
    shimmerX.value = withDelay(500,
      withRepeat(
        withTiming(2.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1, false,
      ),
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value * 20 }],
  }));

  return (
    <View style={s.glowWrap}>
      <View style={s.goldGlow} />
      <View style={s.goldOuter}>
        <LinearGradient
          colors={['#8B6914', '#C9A035', '#E8D068', '#F5E898', '#E8D068', '#C9A035', '#8B6914']}
          locations={[0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.goldInnerBorder} />
        <Animated.View style={[s.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text style={s.goldText}>#1</Text>
      </View>
    </View>
  );
}

// ── #2 Silver ──
export function RankTwoBadge() {
  return (
    <View style={s.silverOuter}>
      <LinearGradient
        colors={['#5a5a5a', '#8a8a8a', '#b8b8b8', '#d4d4d4', '#b8b8b8', '#8a8a8a', '#5a5a5a']}
        locations={[0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={s.silverText}>#2</Text>
    </View>
  );
}

// ── #3 Bronze ──
export function RankThreeBadge() {
  return (
    <View style={s.bronzeOuter}>
      <LinearGradient
        colors={['#5c3a1a', '#8b5e2f', '#b27a3d', '#cd9a5c', '#b27a3d', '#8b5e2f', '#5c3a1a']}
        locations={[0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={s.bronzeText}>#3</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Gold
  glowWrap: { position: 'relative' },
  goldGlow: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 9, backgroundColor: 'rgba(232,208,104,0.08)',
    shadowColor: '#E8D068', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
  },
  goldOuter: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(232,208,104,0.6)',
  },
  goldInnerBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: 5, borderWidth: 0.5,
    borderColor: 'rgba(255,248,200,0.3)',
  },
  shimmer: {
    position: 'absolute', top: -4, bottom: -4, width: 8,
    transform: [{ rotate: '35deg' }],
  },
  goldText: {
    fontSize: 9, fontWeight: '900', color: '#3d2800', letterSpacing: 0.5, zIndex: 2,
    textShadowColor: 'rgba(255,248,200,0.6)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 0.5 },
  },

  // Silver
  silverOuter: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(180,180,180,0.4)',
  },
  silverText: {
    fontSize: 9, fontWeight: '900', color: '#e0e0e0', letterSpacing: 0.5, zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 1, textShadowOffset: { width: 0, height: 0.5 },
  },

  // Bronze
  bronzeOuter: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(178,122,61,0.4)',
  },
  bronzeText: {
    fontSize: 9, fontWeight: '900', color: '#f0d4b0', letterSpacing: 0.5, zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 1, textShadowOffset: { width: 0, height: 0.5 },
  },
});

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, withSequence, Easing,
} from 'react-native-reanimated';

// Recreates the canvas "spark lines" effect from CSS/JS using Reanimated
// Tiny glowing dots that radiate outward in hex directions, fade, and loop

interface Props {
  width: number;
  height: number;
  color?: string;
  count?: number;
}

const BASE_RAD = (Math.PI * 2) / 6; // hexagonal directions

function Particle({ cx, cy, color, index, total }: { cx: number; cy: number; color: string; index: number; total: number }) {
  // Each particle has a random hex direction and lifetime
  const seed = useMemo(() => ({
    angle: BASE_RAD * Math.floor(Math.random() * 6) + (Math.random() - 0.5) * 0.4,
    dist: 15 + Math.random() * 40,
    delay: Math.random() * 3000,
    duration: 1500 + Math.random() * 2000,
    size: 1.5 + Math.random() * 2,
  }), []);

  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(seed.delay,
      withRepeat(
        withTiming(1, { duration: seed.duration, easing: Easing.out(Easing.quad) }),
        -1, false,
      ),
    );
    opacity.value = withDelay(seed.delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: seed.duration * 0.3, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: seed.duration * 0.7, easing: Easing.in(Easing.quad) }),
        ),
        -1, false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(seed.angle) * seed.dist * progress.value;
    const y = Math.sin(seed.angle) * seed.dist * progress.value;
    return {
      position: 'absolute',
      left: cx + x - seed.size / 2,
      top: cy + y - seed.size / 2,
      width: seed.size,
      height: seed.size,
      borderRadius: seed.size / 2,
      backgroundColor: color,
      opacity: opacity.value,
      shadowColor: color,
      shadowRadius: 4,
      shadowOpacity: 0.8,
      shadowOffset: { width: 0, height: 0 },
    };
  });

  return <Animated.View style={style} />;
}

export function SparkLines({ width, height, color = '#FF6C24', count = 20 }: Props) {
  const cx = width / 2;
  const cy = height / 2;

  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => i),
    [count],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { width, height, overflow: 'visible' }]} pointerEvents="none">
      {particles.map(i => (
        <Particle key={i} cx={cx} cy={cy} color={color} index={i} total={count} />
      ))}
    </View>
  );
}

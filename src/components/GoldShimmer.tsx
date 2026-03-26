import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Single sweep shine across a gold surface — very lightweight
export function GoldShimmer() {
  const x = useSharedValue(-1);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1, false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${x.value * 100}%` as any }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: '40%' }, style]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,220,150,0.15)', 'rgba(255,240,200,0.25)', 'rgba(255,220,150,0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

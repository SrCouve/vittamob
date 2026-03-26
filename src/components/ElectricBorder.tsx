import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Generate a jagged lightning bolt path along a segment
function boltPath(x1: number, y1: number, x2: number, y2: number, jag: number): string {
  const steps = 6;
  const dx = (x2 - x1) / steps;
  const dy = (y2 - y1) / steps;
  // perpendicular direction
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = -dy / len;
  const py = dx / len;
  let d = `M${x1} ${y1}`;
  for (let i = 1; i < steps; i++) {
    const offset = (Math.random() - 0.5) * 2 * jag;
    d += ` L${x1 + dx * i + px * offset} ${y1 + dy * i + py * offset}`;
  }
  d += ` L${x2} ${y2}`;
  return d;
}

interface BoltProps {
  width: number;
  height: number;
  index: number;
  borderRadius: number;
  intense?: boolean;
}

function LightningBolt({ width, height, index, borderRadius, intense }: BoltProps) {
  const opacity = useSharedValue(0);

  // Each bolt flickers at random intervals
  useEffect(() => {
    const delay = 300 + index * 700 + Math.random() * 1000;
    opacity.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 60 }),
          withTiming(0.2, { duration: 80 }),
          withTiming(0.7, { duration: 40 }),
          withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1500 + Math.random() * 2000 }),
        ),
        -1, false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Generate bolt along a random edge segment
  const pathD = useMemo(() => {
    const r = borderRadius;
    const perimeter = 2 * (width + height) - 8 * r + 2 * Math.PI * r;
    const startPos = (index / 4) * perimeter + Math.random() * perimeter * 0.2;
    const boltLen = intense ? 35 + Math.random() * 50 : 20 + Math.random() * 30;

    // Convert perimeter position to x,y
    function perimeterToXY(pos: number): [number, number] {
      let p = pos % perimeter;
      // Top edge
      const topLen = width - 2 * r;
      if (p < topLen) return [r + p, 0];
      p -= topLen;
      // Top-right corner (approximate as straight)
      const cornerLen = Math.PI * r / 2;
      if (p < cornerLen) { const a = -Math.PI/2 + (p/cornerLen) * Math.PI/2; return [width - r + Math.cos(a) * r, r + Math.sin(a) * r]; }
      p -= cornerLen;
      // Right edge
      const rightLen = height - 2 * r;
      if (p < rightLen) return [width, r + p];
      p -= rightLen;
      // Bottom-right corner
      if (p < cornerLen) { const a = (p/cornerLen) * Math.PI/2; return [width - r + Math.cos(a) * r, height - r + Math.sin(a) * r]; }
      p -= cornerLen;
      // Bottom edge
      if (p < topLen) return [width - r - p, height];
      p -= topLen;
      // Bottom-left corner
      if (p < cornerLen) { const a = Math.PI/2 + (p/cornerLen) * Math.PI/2; return [r + Math.cos(a) * r, height - r + Math.sin(a) * r]; }
      p -= cornerLen;
      // Left edge
      if (p < rightLen) return [0, height - r - p];
      p -= rightLen;
      // Top-left corner
      if (p < cornerLen) { const a = Math.PI + (p/cornerLen) * Math.PI/2; return [r + Math.cos(a) * r, r + Math.sin(a) * r]; }
      return [r, 0];
    }

    const [x1, y1] = perimeterToXY(startPos);
    const [x2, y2] = perimeterToXY(startPos + boltLen);
    return boltPath(x1, y1, x2, y2, 4);
  }, [width, height, borderRadius, index]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={pathD} stroke="#FF6C24" strokeWidth={intense ? 2.5 : 1.5} fill="none" strokeLinecap="round" />
        <Path d={pathD} stroke="#FFAC7D" strokeWidth={intense ? 6 : 3} fill="none" strokeLinecap="round" opacity={intense ? 0.5 : 0.3} />
      </Svg>
    </Animated.View>
  );
}

export function ElectricBorder({ borderRadius = 10, width = 0, height = 0, intense = false }: { borderRadius?: number; width?: number; height?: number; intense?: boolean }) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.5,
    shadowOpacity: pulse.value,
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.value * 0.4,
  }));

  return (
    <>
      {/* Outer glow */}
      <Animated.View
        style={[{
          ...StyleSheet.absoluteFillObject,
          borderRadius: borderRadius + 2,
          borderWidth: intense ? 2 : 1.5,
          borderColor: '#FF6C24',
          shadowColor: '#FF6C24',
          shadowRadius: intense ? 20 : 12,
          shadowOffset: { width: 0, height: 0 },
        }, glowStyle]}
        pointerEvents="none"
      />
      {/* Inner border */}
      <Animated.View
        style={[{
          ...StyleSheet.absoluteFillObject,
          borderRadius,
          borderWidth: 1,
          borderColor: 'rgba(255,140,60,0.6)',
        }, innerGlowStyle]}
        pointerEvents="none"
      />
      {/* Lightning bolts */}
      {width > 0 && height > 0 && [0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => (
        <LightningBolt key={i} width={width} height={height} index={i} borderRadius={borderRadius} intense={intense} />
      ))}
    </>
  );
}

import React, { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'light' | 'medium' | 'heavy' | 'orange';
  intensity?: number;
}

// Web reference variants (from Tailwind):
// light:  bg-white/5  backdrop-blur-md(12px)  border-white/10
// medium: bg-white/10 backdrop-blur-xl(24px)  border-white/15
// heavy:  bg-white/18 backdrop-blur-2xl(40px) border-white/22
// orange: bg-[#FF6C24]/8 backdrop-blur-xl(24px) border-[#FF6C24]/15

const variantConfig = {
  light: {
    bgColors: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)'] as const,
    borderColor: 'rgba(255,255,255,0.10)',
    blurPx: 12,
    nativeIntensity: 25,
  },
  medium: {
    bgColors: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.06)'] as const,
    borderColor: 'rgba(255,255,255,0.15)',
    blurPx: 24,
    nativeIntensity: 40,
  },
  heavy: {
    bgColors: ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.12)'] as const,
    borderColor: 'rgba(255,255,255,0.22)',
    blurPx: 40,
    nativeIntensity: 60,
  },
  orange: {
    bgColors: ['rgba(255,108,36,0.08)', 'rgba(255,108,36,0.04)'] as const,
    borderColor: 'rgba(255,108,36,0.15)',
    blurPx: 24,
    nativeIntensity: 40,
  },
};

export function GlassCard({ children, style, variant = 'medium', intensity }: GlassCardProps) {
  const config = variantConfig[variant];
  const nativeIntensity = intensity ?? config.nativeIntensity;

  const webGlassStyle = isWeb ? {
    backdropFilter: `blur(${config.blurPx}px)`,
    WebkitBackdropFilter: `blur(${config.blurPx}px)`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  } as any : {};

  return (
    <View style={[styles.container, { borderColor: config.borderColor }, webGlassStyle, style]}>
      {!isWeb && (
        <BlurView intensity={nativeIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient
        colors={config.bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top specular highlight */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specular}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
    zIndex: 1,
  },
  content: {
    zIndex: 2,
  },
});

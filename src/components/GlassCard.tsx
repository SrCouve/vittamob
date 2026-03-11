import React, { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'medium' | 'light' | 'orange';
  intensity?: number;
}

export function GlassCard({ children, style, variant = 'medium', intensity = 40 }: GlassCardProps) {
  const borderColor = variant === 'orange'
    ? 'rgba(255,108,36,0.15)'
    : variant === 'light'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(255,255,255,0.12)';

  const bgColors = variant === 'orange'
    ? ['rgba(255,108,36,0.08)', 'rgba(255,108,36,0.04)'] as const
    : variant === 'light'
      ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)'] as const
      : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.06)'] as const;

  const webGlassStyle = Platform.OS === 'web' ? {
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.1)',
  } as any : {};

  return (
    <View style={[styles.container, { borderColor }, webGlassStyle, style]}>
      {Platform.OS !== 'web' && (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient
        colors={bgColors}
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

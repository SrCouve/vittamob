import React, { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../stores/themeStore';

const isWeb = Platform.OS === 'web';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'light' | 'medium' | 'heavy' | 'orange';
  intensity?: number;
}

export function GlassCard({ children, style, variant = 'medium', intensity }: GlassCardProps) {
  const glassTheme = useThemeStore((s) => s.glassTheme);
  const isOrange = variant === 'orange';
  const isDark = glassTheme === 'dark';

  const webGlassStyle = isWeb ? {
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  } as any : {};

  // Dark theme: same as meta semanal (dark base + orange gradient + blur 45 + warm specular)
  // Light theme: original glass (white gradient + blur + subtle specular)

  return (
    <View style={[styles.container, {
      borderColor: isDark
        ? (isOrange ? 'rgba(255,108,36,0.15)' : 'rgba(255,140,100,0.2)')
        : (isOrange ? 'rgba(255,108,36,0.15)' : 'rgba(255,255,255,0.15)'),
      shadowColor: isDark ? '#FF6C24' : '#000',
      shadowOpacity: isDark ? 0.08 : 0.15,
    }, webGlassStyle, style]}>

      {isDark && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      )}

      <LinearGradient
        colors={isDark
          ? (isOrange
            ? ['rgba(255,108,36,0.14)', 'rgba(255,133,64,0.06)', 'rgba(255,108,36,0.10)']
            : ['rgba(255,108,36,0.10)', 'rgba(255,133,64,0.04)', 'rgba(255,172,125,0.06)'])
          : (isOrange
            ? ['rgba(255,108,36,0.08)', 'rgba(255,108,36,0.04)']
            : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.06)'])
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {!isWeb && (
        <BlurView intensity={intensity ?? (isDark ? 45 : 40)} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      {/* Specular highlight */}
      <LinearGradient
        colors={isDark
          ? ['transparent', 'rgba(255,200,170,0.35)', 'transparent']
          : ['transparent', 'rgba(255,255,255,0.08)', 'transparent']
        }
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
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  content: {
    zIndex: 2,
  },
});

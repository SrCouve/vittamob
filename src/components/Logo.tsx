import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { FONTS } from '../constants/theme';

const isWeb = Platform.OS === 'web';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'gradient' | 'white' | 'dark';
}

const sizes = {
  sm: 20,
  md: 30,
  lg: 48,
};

export function Logo({ size = 'md', variant = 'gradient' }: LogoProps) {
  const fontSize = sizes[size];

  if (variant === 'gradient' && isWeb) {
    // Web: CSS gradient text identical to the reference
    const gradientStyle = {
      background: 'linear-gradient(135deg, #FF6C24 0%, #FF8540 50%, #FFAC7D 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    } as any;

    return (
      <View style={styles.row}>
        <Text style={[styles.vitta, { fontSize }, gradientStyle]}>VITTA</Text>
        <Text style={[styles.up, { fontSize }, gradientStyle]}> UP</Text>
      </View>
    );
  }

  if (variant === 'gradient') {
    // Native: solid orange fallback (MaskedView not available everywhere)
    return (
      <View style={styles.row}>
        <Text style={[styles.vitta, { fontSize, color: '#FF6C24' }]}>VITTA</Text>
        <Text style={[styles.up, { fontSize, color: '#FFAC7D' }]}> UP</Text>
      </View>
    );
  }

  const color = variant === 'dark' ? '#202020' : '#fff';

  return (
    <View style={styles.row}>
      <Text style={[styles.vitta, { fontSize, color }]}>VITTA</Text>
      <Text style={[styles.up, { fontSize, color }]}> UP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  vitta: {
    fontFamily: FONTS.montserrat.extrabold,
    letterSpacing: -0.5,
  },
  up: {
    fontFamily: FONTS.montserrat.light,
    letterSpacing: -0.5,
  },
});

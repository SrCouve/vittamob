import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export function BackgroundOrbs() {
  if (isWeb) {
    // Web: use exact same CSS as the reference — fixed, z-index -10, CSS filter blur
    const containerStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -10,
      overflow: 'hidden',
      pointerEvents: 'none',
    } as any;

    return (
      <View style={containerStyle}>
        {/* Warm orange orb - top right — #FF6C24 at 20%, blur 100px */}
        <View style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: 'rgba(255,108,36,0.20)',
          filter: 'blur(100px)',
        } as any} />
        {/* Peach orb - bottom left — #FFAC7D at 15%, blur 80px */}
        <View style={{
          position: 'absolute',
          bottom: 160,
          left: -80,
          width: 256,
          height: 256,
          borderRadius: 128,
          backgroundColor: 'rgba(255,172,125,0.15)',
          filter: 'blur(80px)',
        } as any} />
        {/* Subtle warm orb - center — #FF8540 at 8%, blur 120px */}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 384,
          height: 384,
          borderRadius: 192,
          backgroundColor: 'rgba(255,133,64,0.08)',
          filter: 'blur(120px)',
        } as any} />
      </View>
    );
  }

  // Native: larger orbs with reduced opacity to simulate blur diffusion
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', pointerEvents: 'none' } as any]}>
      <View style={styles.orbNative1} />
      <View style={styles.orbNative2} />
      <View style={styles.orbNative3} />
    </View>
  );
}

const styles = StyleSheet.create({
  orbNative1: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: 'rgba(255,108,36,0.08)',
  },
  orbNative2: {
    position: 'absolute',
    bottom: 40,
    left: -200,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: 'rgba(255,172,125,0.06)',
  },
  orbNative3: {
    position: 'absolute',
    top: height / 2 - 320,
    left: width / 2 - 320,
    width: 640,
    height: 640,
    borderRadius: 320,
    backgroundColor: 'rgba(255,133,64,0.04)',
  },
});

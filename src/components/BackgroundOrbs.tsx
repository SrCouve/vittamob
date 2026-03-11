import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Web reference (Tailwind → CSS):
// Orb 1: bg-[#FF6C24]/20  = rgba(255,108,36, 0.20)  blur-[100px]  -top-20 -right-20  w-80 h-80
// Orb 2: bg-[#FFAC7D]/15  = rgba(255,172,125,0.15)  blur-[80px]   bottom-40 -left-20  w-64 h-64
// Orb 3: bg-[#FF8540]/8   = rgba(255,133,64, 0.08)  blur-[120px]  top-1/2 left-1/2 centered  w-96 h-96

export function BackgroundOrbs() {
  const orb1Ref = useRef<any>(null);
  const orb2Ref = useRef<any>(null);
  const orb3Ref = useRef<any>(null);

  useEffect(() => {
    if (!isWeb) return;
    const applyFilter = (ref: React.RefObject<any>, blur: string) => {
      const node = ref.current as any;
      if (node) {
        const el = node instanceof HTMLElement ? node : node;
        if (el && el.style) {
          el.style.filter = blur;
        }
      }
    };
    requestAnimationFrame(() => {
      applyFilter(orb1Ref, 'blur(100px)');
      applyFilter(orb2Ref, 'blur(80px)');
      applyFilter(orb3Ref, 'blur(120px)');
    });
  }, []);

  if (!isWeb) {
    // Native: use radial-like gradients with large shadow to simulate blur
    return (
      <View style={[StyleSheet.absoluteFill, styles.container]}>
        {/* Orb 1: top-right — warm orange */}
        <View style={styles.nativeOrb1}>
          <LinearGradient
            colors={['rgba(255,108,36,0.12)', 'rgba(255,108,36,0.04)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0, y: 0 }}
          />
        </View>
        {/* Orb 2: bottom-left — peach */}
        <View style={styles.nativeOrb2}>
          <LinearGradient
            colors={['rgba(255,172,125,0.10)', 'rgba(255,172,125,0.03)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0, y: 0 }}
          />
        </View>
        {/* Orb 3: center — subtle warm */}
        <View style={styles.nativeOrb3}>
          <LinearGradient
            colors={['rgba(255,133,64,0.06)', 'rgba(255,133,64,0.02)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0, y: 0 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      <View ref={orb1Ref} style={styles.orb1} />
      <View ref={orb2Ref} style={styles.orb2} />
      <View ref={orb3Ref} style={styles.orb3} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    // @ts-ignore
    pointerEvents: 'none',
  },
  // Web sizes (CSS blur handles diffusion)
  orb1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,108,36,0.20)',
  },
  orb2: {
    position: 'absolute',
    bottom: 160,
    left: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255,172,125,0.15)',
  },
  orb3: {
    position: 'absolute',
    top: '50%' as any,
    left: '50%' as any,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: 'rgba(255,133,64,0.08)',
    // @ts-ignore
    transform: 'translate(-50%, -50%)',
  },
  // Native: much larger orbs with gradient fade to simulate blur
  nativeOrb1: {
    position: 'absolute',
    top: -300,
    right: -300,
    width: 700,
    height: 700,
    borderRadius: 350,
    overflow: 'hidden',
    shadowColor: '#FF6C24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 100,
  },
  nativeOrb2: {
    position: 'absolute',
    bottom: -100,
    left: -300,
    width: 600,
    height: 600,
    borderRadius: 300,
    overflow: 'hidden',
    shadowColor: '#FFAC7D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 80,
  },
  nativeOrb3: {
    position: 'absolute',
    top: height / 2 - 400,
    left: width / 2 - 400,
    width: 800,
    height: 800,
    borderRadius: 400,
    overflow: 'hidden',
    shadowColor: '#FF8540',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 120,
  },
});

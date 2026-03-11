import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';

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
    // react-native-web strips `filter` from styles, so we apply it directly to the DOM
    const applyFilter = (ref: React.RefObject<any>, blur: string) => {
      const node = ref.current as any;
      if (node) {
        // react-native-web View refs point to the DOM element directly
        const el = node instanceof HTMLElement ? node : node._nativeTag || node;
        if (el && el.style) {
          el.style.filter = blur;
        }
      }
    };
    // Small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      applyFilter(orb1Ref, 'blur(100px)');
      applyFilter(orb2Ref, 'blur(80px)');
      applyFilter(orb3Ref, 'blur(120px)');
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      {/* Orb 1: top-right — warm orange */}
      <View ref={orb1Ref} style={styles.orb1} />
      {/* Orb 2: bottom-left — peach (tom diferente!) */}
      <View ref={orb2Ref} style={styles.orb2} />
      {/* Orb 3: center — subtle warm */}
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
    top: isWeb ? -80 : -200,
    right: isWeb ? -80 : -200,
    width: isWeb ? 320 : 560,
    height: isWeb ? 320 : 560,
    borderRadius: isWeb ? 160 : 280,
    backgroundColor: isWeb ? 'rgba(255,108,36,0.20)' : 'rgba(255,108,36,0.08)',
  },
  orb2: {
    position: 'absolute',
    bottom: isWeb ? 160 : 40,
    left: isWeb ? -80 : -200,
    width: isWeb ? 256 : 480,
    height: isWeb ? 256 : 480,
    borderRadius: isWeb ? 128 : 240,
    backgroundColor: isWeb ? 'rgba(255,172,125,0.15)' : 'rgba(255,172,125,0.06)',
  },
  orb3: {
    position: 'absolute',
    top: isWeb ? '50%' as any : height / 2 - 320,
    left: isWeb ? '50%' as any : width / 2 - 320,
    width: isWeb ? 384 : 640,
    height: isWeb ? 384 : 640,
    borderRadius: isWeb ? 192 : 320,
    backgroundColor: isWeb ? 'rgba(255,133,64,0.08)' : 'rgba(255,133,64,0.04)',
    // @ts-ignore
    ...(isWeb ? { transform: 'translate(-50%, -50%)' } : {}),
  },
});

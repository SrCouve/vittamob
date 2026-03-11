import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, router } from 'expo-router';

const isWeb = Platform.OS === 'web';
const webNavGlass = isWeb
  ? ({
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      boxShadow: '0 20px 30px rgba(0,0,0,0.6)',
    } as any)
  : {};

import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { FONTS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollY } from '../context/ScrollContext';

const SPRING = { damping: 26, stiffness: 320, mass: 0.8 };
const SPRING_FAST = { damping: 22, stiffness: 400, mass: 0.7 };

const tabs = [
  { href: '/(tabs)', label: 'Início', icon: 'home' },
  { href: '/(tabs)/modulos', label: 'Módulos', icon: 'grid' },
  { href: '/(tabs)/aulas', label: 'Aulas', icon: 'play' },
  { href: '/(tabs)/perfil', label: 'Perfil', icon: 'user' },
];

function TabIcon({ name, active, size = 21 }: { name: string; active: boolean; size?: number }) {
  const color = active ? '#FF6C24' : 'rgba(255,255,255,0.3)';
  const sw = active ? 2.2 : 1.4;

  const iconScale = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(active ? 1.1 : 1, SPRING_FAST) }],
  }));

  const icon = (() => {
    switch (name) {
      case 'home':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
          </Svg>
        );
      case 'grid':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="3" width="7" height="7" />
            <Rect x="14" y="3" width="7" height="7" />
            <Rect x="14" y="14" width="7" height="7" />
            <Rect x="3" y="14" width="7" height="7" />
          </Svg>
        );
      case 'play':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Path d="m10 8 6 4-6 4z" />
          </Svg>
        );
      case 'user':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
          </Svg>
        );
      default:
        return null;
    }
  })();

  return <Animated.View style={iconScale}>{icon}</Animated.View>;
}

function TabItem({ tab, isActive, onPress }: { tab: (typeof tabs)[0]; isActive: boolean; onPress: () => void }) {
  const widthStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 114 : 50, SPRING),
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.tabItem, widthStyle]}>
        {/* Active: inner glass bubble */}
        {isActive && (
          <>
            {/* Dark glass backdrop for depth */}
            <View style={[StyleSheet.absoluteFill, { borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.15)' }]} />
            {/* Orange gradient glow */}
            <LinearGradient
              colors={['rgba(255,140,80,0.28)', 'rgba(255,108,36,0.16)', 'rgba(255,133,64,0.22)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 25 }]}
            />
            {/* Inner border glow */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 25,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255,160,110,0.3)',
                },
              ]}
            />
            {/* Top specular highlight */}
            <LinearGradient
              colors={['transparent', 'rgba(255,210,180,0.55)', 'rgba(255,230,210,0.65)', 'rgba(255,210,180,0.55)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabSpecular}
            />
          </>
        )}
        <View style={styles.tabContent}>
          <TabIcon name={tab.icon} active={isActive} />
          {isActive && (
            <Animated.Text
              entering={FadeIn.duration(220).delay(60)}
              exiting={FadeOut.duration(100)}
              style={styles.tabLabel}
              numberOfLines={1}
            >
              {tab.label}
            </Animated.Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function MainPill({ activeIndex }: { activeIndex: number }) {
  const mainTabs = tabs.slice(0, 3);

  return (
    <Animated.View style={[styles.mainPill, webNavGlass]}>
      {!isWeb && <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />}
      {/* Glass gradient */}
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.10)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top edge highlight */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 0.5 }}
      />
      <View style={styles.mainPillInner}>
        {mainTabs.map((tab, index) => (
          <TabItem
            key={tab.href}
            tab={tab}
            isActive={index === activeIndex}
            onPress={() => router.replace(tab.href as any)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function ProfilePill({ active }: { active: boolean }) {
  const tab = tabs[3];

  const widthStyle = useAnimatedStyle(() => ({
    width: withSpring(active ? 104 : 50, SPRING),
  }));

  return (
    <TouchableOpacity onPress={() => router.replace(tab.href as any)} activeOpacity={0.7}>
      <Animated.View style={[styles.profilePill, widthStyle, webNavGlass]}>
        {!isWeb && <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />}
        {active ? (
          <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
            <LinearGradient
              colors={['rgba(255,140,80,0.28)', 'rgba(255,108,36,0.16)', 'rgba(255,133,64,0.22)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 25, borderWidth: 0.5, borderColor: 'rgba(255,160,110,0.3)' },
              ]}
            />
          </>
        ) : (
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.10)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Top edge highlight */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 0.5 }}
        />
        {active && (
          <LinearGradient
            colors={['transparent', 'rgba(255,210,180,0.55)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tabSpecular}
          />
        )}
        <View style={styles.tabContent}>
          <TabIcon name="user" active={active} />
          {active && (
            <Animated.Text
              entering={FadeIn.duration(220).delay(60)}
              exiting={FadeOut.duration(100)}
              style={styles.tabLabel}
              numberOfLines={1}
            >
              Perfil
            </Animated.Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const scrollY = useScrollY();

  const activeIndex = tabs.findIndex((tab) => {
    if (tab.href === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }
    const base = tab.href.replace('/(tabs)', '');
    return pathname === base || pathname.startsWith(base + '/');
  });

  // Liquid glass separation effect: gap grows when scrolling down
  const gapStyle = useAnimatedStyle(() => {
    const gap = interpolate(
      scrollY.value,
      [0, 80, 200],
      [6, 6, 100],
      Extrapolation.CLAMP,
    );
    return {
      width: withSpring(gap, { damping: 24, stiffness: 200, mass: 1 }),
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.navRow}>
        <MainPill activeIndex={activeIndex} />
        <Animated.View style={gapStyle} />
        <ProfilePill active={activeIndex === 3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainPill: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  mainPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 5,
  },
  profilePill: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#FF8540',
  },
  tabSpecular: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
    zIndex: 1,
  },
});

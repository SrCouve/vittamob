import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, router } from 'expo-router';

const isWeb = Platform.OS === 'web';
const webNavGlass = isWeb ? {
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  boxShadow: '0 20px 30px rgba(0,0,0,0.6)',
} as any : {};
import Animated, {
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';
import { FONTS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPRING = { damping: 28, stiffness: 350, mass: 0.9 };

const tabs = [
  { href: '/(tabs)', label: 'Início', icon: 'home' },
  { href: '/(tabs)/modulos', label: 'Módulos', icon: 'grid' },
  { href: '/(tabs)/aulas', label: 'Aulas', icon: 'play' },
  { href: '/(tabs)/perfil', label: 'Perfil', icon: 'user' },
];

function TabIcon({ name, active, size = 21 }: { name: string; active: boolean; size?: number }) {
  const color = active ? '#FF6C24' : 'rgba(255,255,255,0.3)';
  const sw = active ? 2.2 : 1.4;

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
}

function MainPill({ activeIndex }: { activeIndex: number }) {
  const mainTabs = tabs.slice(0, 3);

  return (
    <View style={[styles.mainPill, webNavGlass]}>
      {!isWeb && <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />}
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.1)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.mainPillInner}>
        {mainTabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={tab.href}
              onPress={() => router.replace(tab.href as any)}
              activeOpacity={0.7}
            >
              <Animated.View
                layout={Layout.springify().damping(28).stiffness(350)}
                style={[
                  styles.tabItem,
                  { width: isActive ? 110 : 50 },
                ]}
              >
                {isActive && (
                  <>
                    <LinearGradient
                      colors={['rgba(255,140,80,0.22)', 'rgba(255,108,36,0.14)', 'rgba(255,133,64,0.18)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 25 }]}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(255,200,170,0.5)', 'transparent']}
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
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
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
        })}
      </View>
    </View>
  );
}

function ProfilePill({ active }: { active: boolean }) {
  const tab = tabs[3];

  return (
    <TouchableOpacity
      onPress={() => router.replace(tab.href as any)}
      activeOpacity={0.7}
    >
      <Animated.View
        layout={Layout.springify().damping(28).stiffness(350)}
        style={[styles.profilePill, { width: active ? 100 : 50 }, webNavGlass]}
      >
        {!isWeb && <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />}
        {active ? (
          <LinearGradient
            colors={['rgba(255,140,80,0.22)', 'rgba(255,108,36,0.14)', 'rgba(255,133,64,0.18)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <LinearGradient
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.1)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {active && (
          <LinearGradient
            colors={['transparent', 'rgba(255,200,170,0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tabSpecular}
          />
        )}
        <View style={styles.tabContent}>
          <TabIcon name="user" active={active} />
          {active && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
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

  const activeIndex = tabs.findIndex((tab) => {
    if (tab.href === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }
    const base = tab.href.replace('/(tabs)', '');
    return pathname === base || pathname.startsWith(base + '/');
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.navRow}>
        <MainPill activeIndex={activeIndex} />
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
    gap: 6,
  },
  mainPill: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  mainPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
  },
  profilePill: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
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

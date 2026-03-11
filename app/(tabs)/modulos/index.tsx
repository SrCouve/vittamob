import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect, Circle, Polyline, Line } from 'react-native-svg';
import { GlassCard } from '../../../src/components/GlassCard';
import { FONTS } from '../../../src/constants/theme';

// Icons matching web Lucide icons
function DumbbellIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m6.5 6.5 11 11" />
      <Path d="m21 21-1-1" />
      <Path d="m3 3 1 1" />
      <Path d="m18 22 4-4" />
      <Path d="m2 6 4-4" />
      <Path d="m3 10 7-7" />
      <Path d="m14 21 7-7" />
    </Svg>
  );
}

function HeartIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Svg>
  );
}

function BrainIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <Path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <Path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <Path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <Path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <Path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <Path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <Path d="M6 18a4 4 0 0 1-1.967-.516" />
      <Path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </Svg>
  );
}

function FlameIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Svg>
  );
}

function BookOpenIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

function AppleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <Path d="M10 2c1 .5 2 2 2 5" />
    </Svg>
  );
}

const modules = [
  { id: '1', title: 'Força & Performance', description: 'Evolua seu treino com foco em força e performance física', lessons: 16, duration: '6h', Icon: DumbbellIcon, progress: 65 },
  { id: '2', title: 'Yoga', description: 'Mobilidade, equilíbrio e respiração para corpo e mente', lessons: 12, duration: '4h 30min', Icon: HeartIcon, progress: 30 },
  { id: '3', title: 'Mindset & Meditação', description: 'Clareza mental e redução do estresse', lessons: 8, duration: '2h 15min', Icon: BrainIcon, progress: 10 },
  { id: '4', title: 'Treino Funcional', description: 'Movimentos naturais que melhoram agilidade e resistência', lessons: 20, duration: '8h', Icon: FlameIcon, progress: 0 },
  { id: '5', title: 'Pilates', description: 'Fortalecimento do core e controle corporal', lessons: 10, duration: '3h 30min', Icon: BookOpenIcon, progress: 0 },
  { id: '6', title: 'Nutrição', description: 'Estratégias alimentares para seu bem-estar', lessons: 15, duration: '5h', Icon: AppleIcon, progress: 0 },
];

export default function ModulosScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(500)}>
        <Text style={styles.pageTitle}>Módulos</Text>
        <Text style={styles.pageSubtitle}>Explore todas as trilhas de wellness</Text>
      </Animated.View>

      {modules.map((mod, index) => {
        const { Icon } = mod;
        return (
          <Animated.View key={mod.id} entering={FadeInDown.delay(50 * (index + 1)).duration(500)}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/modulos/${mod.id}` as any)}
            >
              <GlassCard style={styles.moduleCard}>
                <View style={styles.moduleInner}>
                  <View style={styles.moduleIconWrap}>
                    <Icon size={22} />
                  </View>
                  <View style={styles.moduleText}>
                    <Text style={styles.moduleTitle}>{mod.title}</Text>
                    <Text style={styles.moduleDesc} numberOfLines={2}>{mod.description}</Text>
                    <Text style={styles.moduleMeta}>{mod.lessons} aulas · {mod.duration}</Text>
                  </View>
                </View>
                {mod.progress > 0 && (
                  <View style={styles.progressBg}>
                    <LinearGradient
                      colors={['#FF6C24', '#FFAC7D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${mod.progress}%` }]}
                    />
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 30, marginBottom: 4 },
  pageSubtitle: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 },
  moduleCard: { padding: 20, marginBottom: 12 },
  moduleInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  moduleIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,108,36,0.15)', justifyContent: 'center', alignItems: 'center' },
  moduleText: { flex: 1 },
  moduleTitle: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 16 },
  moduleDesc: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  moduleMeta: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 3 },
});

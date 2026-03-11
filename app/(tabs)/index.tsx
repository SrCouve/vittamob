import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Logo } from '../../src/components/Logo';
import { GlassCard } from '../../src/components/GlassCard';
import { FONTS, COLORS } from '../../src/constants/theme';
import Svg2, { Path, Polyline, Polygon } from 'react-native-svg';

const isWeb = Platform.OS === 'web';
const webGlass = isWeb ? {
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.1)',
} as any : {};
const webHeroGlass = isWeb ? {
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 20px 50px -12px rgba(255,108,36,0.15), 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,200,170,0.12)',
} as any : {};
// filter is applied via useEffect (react-native-web strips it from styles)

const { width: SCREEN_W } = Dimensions.get('window');

// Mock data
const continueWatching = { title: 'Respiração Consciente', module: 'Meditação', progress: 65, duration: '15 min' };

const modules = [
  { id: '1', title: 'Força & Performance', lessons: 16, color: '#FF6C24', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=500&fit=crop' },
  { id: '2', title: 'Yoga', lessons: 12, color: '#FF8540', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=500&fit=crop' },
  { id: '3', title: 'Mindset & Meditação', lessons: 8, color: '#FFAC7D', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=500&fit=crop' },
  { id: '4', title: 'Treino Funcional', lessons: 20, color: '#FF6C24', image: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&h=500&fit=crop' },
  { id: '5', title: 'Pilates', lessons: 10, color: '#FF8540', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=500&fit=crop' },
  { id: '6', title: 'Nutrição', lessons: 15, color: '#FFAC7D', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=500&fit=crop' },
];

const recentLessons = [
  { id: '1', title: 'Saudação ao Sol', module: 'Yoga Matinal', duration: '22 min' },
  { id: '2', title: 'Atenção Plena', module: 'Meditação Guiada', duration: '15 min' },
  { id: '3', title: 'Smoothies Detox', module: 'Nutrição Inteligente', duration: '12 min' },
];

const popularItems = [
  { title: 'Yoga para Iniciantes', module: 'Yoga', duration: '20 min', students: 142 },
  { title: 'Meditação da Manhã', module: 'Mindset', duration: '10 min', students: 98 },
  { title: 'HIIT Express', module: 'Funcional', duration: '18 min', students: 215 },
];

// Play icon SVG
function PlayIcon({ size = 14, color = '#FF6C24', fill = true }: { size?: number; color?: string; fill?: boolean }) {
  return (
    <Svg2 width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={2}>
      <Polygon points="5 3 19 12 5 21 5 3" />
    </Svg2>
  );
}

function ChevronRight({ size = 14 }: { size?: number }) {
  return (
    <Svg2 width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2} strokeLinecap="round">
      <Polyline points="9 18 15 12 9 6" />
    </Svg2>
  );
}

function useWebFilter(ref: React.RefObject<any>, blur: string) {
  useEffect(() => {
    if (!isWeb) return;
    requestAnimationFrame(() => {
      const node = ref.current as any;
      if (node) {
        const el = node instanceof HTMLElement ? node : node;
        if (el && el.style) el.style.filter = blur;
      }
    });
  }, []);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const heroOrbRef = useRef<any>(null);
  const quoteOrbRef = useRef<any>(null);
  useWebFilter(heroOrbRef, 'blur(60px)');
  useWebFilter(quoteOrbRef, 'blur(60px)');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ══ HEADER ══ */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View>
          <Logo variant="gradient" size="sm" />
          <Text style={styles.greeting}>Olá, Kaio</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/perfil')} style={styles.avatar}>
          <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={styles.avatarText}>K</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ══ CONTINUE WATCHING ══ */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)}>
        <TouchableOpacity activeOpacity={0.8} style={[styles.heroCard, webHeroGlass]} onPress={() => router.push('/aulas/1' as any)}>
          <LinearGradient
            colors={['rgba(255,108,36,0.12)', 'rgba(255,133,64,0.06)', 'rgba(255,172,125,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          {/* Specular */}
          <LinearGradient
            colors={['transparent', 'rgba(255,200,170,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroSpecular}
          />
          {/* Warm orb */}
          <View ref={heroOrbRef} style={styles.heroOrb} />

          <View style={styles.heroContent}>
            {/* Progress Ring */}
            <View style={styles.progressRing}>
              <Svg width={72} height={72} viewBox="0 0 36 36">
                <Defs>
                  <SvgGradient id="vittaProgress" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#FF6C24" />
                    <Stop offset="1" stopColor="#FFAC7D" />
                  </SvgGradient>
                </Defs>
                <SvgCircle cx={18} cy={18} r={15} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
                <SvgCircle
                  cx={18} cy={18} r={15} fill="none"
                  stroke="url(#vittaProgress)"
                  strokeWidth={2.5}
                  strokeDasharray={94.2}
                  strokeDashoffset={94.2 * (1 - continueWatching.progress / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </Svg>
              <View style={styles.progressPlayIcon}>
                <PlayIcon size={20} color="#FF6C24" />
              </View>
            </View>

            <View style={styles.heroText}>
              <Text style={styles.heroLabel}>CONTINUE ASSISTINDO</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>{continueWatching.title}</Text>
              <Text style={styles.heroSub}>{continueWatching.module} · {continueWatching.duration}</Text>
              <View style={styles.heroProgressRow}>
                <View style={styles.heroProgressBg}>
                  <LinearGradient
                    colors={['#FF6C24', '#FFAC7D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.heroProgressFill, { width: `${continueWatching.progress}%` }]}
                  />
                </View>
                <Text style={styles.heroPercent}>{continueWatching.progress}%</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ══ QUICK STATS ══ */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsRow}>
        {/* Streak */}
        <View style={[styles.statCard, webGlass]}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.08)']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statSpecular} />
          <View style={styles.statLottie}>
            <LottieView source={require('../../assets/fire-emoji.json')} autoPlay loop style={{ width: 36, height: 36 }} />
          </View>
          <Text style={styles.statValue}>7 dias</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        {/* Aulas */}
        <View style={[styles.statCard, webGlass]}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.08)']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statSpecular} />
          <View style={styles.statLottieClip}>
            <LottieView source={require('../../assets/presentation-emoji.json')} autoPlay loop style={{ width: 80, height: 80 }} />
          </View>
          <Text style={styles.statValue}>23</Text>
          <Text style={styles.statLabel}>Aulas</Text>
        </View>
        {/* XP */}
        <View style={[styles.statCard, webGlass]}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.08)']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statSpecular} />
          <View style={styles.statLottieClip}>
            <LottieView source={require('../../assets/award-emoji.json')} autoPlay loop style={{ width: 80, height: 80 }} />
          </View>
          <Text style={styles.statValue}>1.2k</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </Animated.View>

      {/* ══ MODULES ══ */}
      <Animated.View entering={FadeInDown.delay(150).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Módulos</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/modulos')} style={styles.seeAll}>
            <Text style={styles.seeAllText}>Ver todos</Text>
            <ChevronRight size={14} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modulesScroll}>
          {modules.map((mod) => (
            <TouchableOpacity key={mod.id} activeOpacity={0.8} style={styles.moduleCard} onPress={() => router.push(`/modulos/${mod.id}` as any)}>
              <Image source={{ uri: mod.image }} style={StyleSheet.absoluteFill} />
              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.4, 0.6, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.moduleTextArea}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleSub}>{mod.lessons} aulas</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ══ RECENT LESSONS ══ */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Aulas Recentes</Text>
        {recentLessons.map((lesson) => (
          <TouchableOpacity key={lesson.id} activeOpacity={0.7} style={styles.lessonRow} onPress={() => router.push(`/aulas/${lesson.id}` as any)}>
            <View style={styles.lessonIcon}>
              <PlayIcon size={14} color="#FF6C24" />
            </View>
            <View style={styles.lessonText}>
              <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
              <Text style={styles.lessonSub}>{lesson.module} · {lesson.duration}</Text>
            </View>
            <ChevronRight size={16} />
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* ══ DAILY QUOTE ══ */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.quoteCard}>
        <LinearGradient
          colors={['rgba(255,108,36,0.08)', 'rgba(255,172,125,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View ref={quoteOrbRef} style={styles.quoteOrb} />
        <Text style={styles.quoteText}>{"\u201C"}O corpo alcança o que a mente acredita.{"\u201D"}</Text>
        <Text style={styles.quoteLabel}>FRASE DO DIA</Text>
      </Animated.View>

      {/* ══ POPULAR ══ */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Populares</Text>
          <Text style={styles.weekLabel}>Esta semana</Text>
        </View>
        {popularItems.map((item, i) => (
          <View key={i} style={styles.popularRow}>
            <Text style={[styles.popularNum, { color: i === 0 ? '#FF6C24' : i === 1 ? '#FF8540' : '#FFAC7D' }]}>{i + 1}</Text>
            <View style={styles.popularText}>
              <Text style={styles.popularTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.popularSub}>{item.module} · {item.duration}</Text>
            </View>
            <Text style={styles.popularStudents}>{item.students}</Text>
          </View>
        ))}
      </Animated.View>

      {/* ══ CHALLENGE ══ */}
      <Animated.View entering={FadeInDown.delay(350).duration(500)}>
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Desafio Ativo</Text>
        <GlassCard style={{ padding: 20 }}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIconRow}>
              <View style={styles.challengeIcon}>
                <Svg2 width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2}>
                  <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
                  <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
                  <Path d="M4 22h16" />
                  <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                  <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                  <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </Svg2>
              </View>
              <View>
                <Text style={styles.challengeName}>7 Dias de Yoga</Text>
                <Text style={styles.challengeDesc}>Pratique todos os dias</Text>
              </View>
            </View>
            <Text style={styles.challengeProgress}>3/7</Text>
          </View>
          <View style={styles.challengeBarBg}>
            <LinearGradient
              colors={['#FF6C24', '#FFAC7D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.challengeBarFill, { width: '43%' }]}
            />
          </View>
        </GlassCard>
      </Animated.View>

      {/* ══ COMMUNITY ══ */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)}>
        <Text style={[styles.sectionTitle, { marginBottom: 16, marginTop: 32 }]}>Comunidade</Text>
        <GlassCard variant="light" style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { name: 'Maria', text: 'Terminei o módulo de Yoga! 🙏', time: '15 min' },
            { name: 'João', text: 'Alguém fazendo o desafio de meditação?', time: '1h' },
            { name: 'Ana', text: 'A aula de HIIT foi insana 🔥', time: '2h' },
          ].map((post, i) => (
            <View key={i} style={[styles.communityRow, i < 2 && styles.communityBorder]}>
              <LinearGradient
                colors={[i === 0 ? '#FF6C24' : i === 1 ? '#FF8540' : '#FFAC7D', '#FFAC7D']}
                style={styles.communityAvatar}
              >
                <Text style={styles.communityInitial}>{post.name[0]}</Text>
              </LinearGradient>
              <View style={styles.communityText}>
                <Text style={styles.communityMsg} numberOfLines={1}>
                  <Text style={styles.communityName}>{post.name}</Text> {post.text}
                </Text>
              </View>
              <Text style={styles.communityTime}>{post.time}</Text>
            </View>
          ))}
        </GlassCard>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 20 },
  avatarText: { fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 14, zIndex: 1 },

  // Hero card
  heroCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,140,100,0.2)', marginBottom: 24, padding: 20, shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 25 },
  heroSpecular: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, zIndex: 5 },
  heroOrb: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,108,36,0.1)' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 20, zIndex: 2 },
  progressRing: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  progressPlayIcon: { position: 'absolute' },
  heroText: { flex: 1 },
  heroLabel: { fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 15, marginTop: 4 },
  heroSub: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  heroProgressBg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 2 },
  heroPercent: { fontFamily: FONTS.montserrat.semibold, color: '#FFAC7D', fontSize: 10 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 32 },
  statSpecular: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, zIndex: 1 },
  statLottie: { width: 36, height: 36, zIndex: 2 },
  statLottieClip: { width: 48, height: 48, marginVertical: -6, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  statValue: { fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 14, marginTop: 6, zIndex: 2 },
  statLabel: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, zIndex: 2 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontFamily: FONTS.playfair.semibold, color: '#fff', fontSize: 20 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  seeAllText: { fontFamily: FONTS.montserrat.medium, color: '#FF8540', fontSize: 12 },
  weekLabel: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.2)', fontSize: 11 },

  // Modules
  modulesScroll: { paddingRight: 20, gap: 12 },
  moduleCard: { width: 160, height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 32, marginBottom: 32 },
  moduleTextArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  moduleTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 13, lineHeight: 17 },
  moduleSub: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },

  // Recent lessons
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  lessonIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,108,36,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)', justifyContent: 'center', alignItems: 'center' },
  lessonText: { flex: 1 },
  lessonTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 13 },
  lessonSub: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },

  // Quote
  quoteCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.12)', padding: 24, alignItems: 'center', marginTop: 16, marginBottom: 32 },
  quoteOrb: {
    position: 'absolute',
    top: -64,
    alignSelf: 'center',
    width: isWeb ? 192 : 400,
    height: isWeb ? 192 : 400,
    borderRadius: isWeb ? 96 : 200,
    backgroundColor: isWeb ? 'rgba(255,108,36,0.06)' : 'rgba(255,108,36,0.025)',
  },
  quoteText: { fontFamily: FONTS.playfair.regular, color: 'rgba(255,255,255,0.9)', fontSize: 18, fontStyle: 'italic', textAlign: 'center', lineHeight: 28, zIndex: 1 },
  quoteLabel: { fontFamily: FONTS.montserrat.medium, color: 'rgba(255,172,125,0.6)', fontSize: 11, marginTop: 12, letterSpacing: 1.5, zIndex: 1 },

  // Popular
  popularRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 4 },
  popularNum: { fontFamily: FONTS.montserrat.bold, fontSize: 18, width: 24, textAlign: 'center' },
  popularText: { flex: 1 },
  popularTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 13 },
  popularSub: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2 },
  popularStudents: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.2)', fontSize: 11 },

  // Challenge
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  challengeIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,108,36,0.12)', justifyContent: 'center', alignItems: 'center' },
  challengeName: { fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 13 },
  challengeDesc: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  challengeProgress: { fontFamily: FONTS.montserrat.bold, color: '#FFAC7D', fontSize: 12 },
  challengeBarBg: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  challengeBarFill: { height: '100%', borderRadius: 2 },

  // Community
  communityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  communityBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  communityAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  communityInitial: { fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 9 },
  communityText: { flex: 1 },
  communityMsg: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  communityName: { fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.9)' },
  communityTime: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.15)', fontSize: 10 },
});

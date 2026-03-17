import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, useAnimatedScrollHandler,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { Logo } from '../../src/components/Logo';
import { GlassCard } from '../../src/components/GlassCard';
import { VerifiedBadge } from '../../src/components/VerifiedBadge';
import { RoutePreview } from '../../src/components/RoutePreview';
import { useScrollY } from '../../src/context/ScrollContext';
import { FONTS, COLORS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useUserStore } from '../../src/stores/userStore';
import { useStravaStore } from '../../src/stores/stravaStore';
import { useSocialStore } from '../../src/stores/socialStore';
import { useCommunityStore, type TopMember } from '../../src/stores/communityStore';

const isWeb = Platform.OS === 'web';
const { width: SCREEN_W } = Dimensions.get('window');

// ── Web glass fallback ──
const webGlass = isWeb ? {
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.1)',
} as any : {};

const webHeroGlass = isWeb ? {
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  boxShadow: '0 20px 50px -12px rgba(255,108,36,0.15), 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,200,170,0.12)',
} as any : {};

// ── Lottie assets ──
const FIRE_ANIM = require('../../assets/fire-emoji.json');
const THUNDER_ANIM = require('../../assets/thunder-energia.json');
const RUNNING_ANIM = require('../../assets/running.json');
const CALENDAR_ANIM = require('../../assets/calendar-weekly.json');
const MEDAL_ANIM = require('../../assets/medal.json');
const HIKER_ANIM = require('../../assets/hiker-journey.json');
const CELEBRATION_ANIM = require('../../assets/celebration.json');
const RUN100_ANIM = require('../../assets/run100.json');
const MOON_ANIM = require('../../assets/moon-night.json');
const SUNSET_ANIM = require('../../assets/sunset.json');

// ── Helpers ──
function formatDistance(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
  if (km >= 100) return Math.round(km).toString();
  return km.toFixed(1);
}

function formatPace(avgSpeed: number): string {
  if (avgSpeed <= 0) return '0:00';
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMovingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}min`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ── Chevron icon ──
function ChevronRight({ size = 14, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Plus icon ──
function PlusIcon({ size = 20, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </Svg>
  );
}

// ── Share icon ──
function ShareIcon({ size = 16, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ══════════════════════════════════════════════════
// ══ HOME SCREEN ══
// ══════════════════════════════════════════════════

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useScrollY();

  // ── Stores ──
  const user = useAuthStore((s) => s.user);
  const { profile } = useUserStore();
  const {
    isConnected: stravaConnected,
    weeklyTotal, weeklyGoal, weeklyKm,
    lifetimeRunCount, avgPace,
    runs,
    fetchRuns,
  } = useStravaStore();
  const {
    friends,
    myFriendsCount,
    fetchFriends,
    fetchMyCounts,
  } = useSocialStore();
  const {
    topMembers,
    fetchTopMembers,
  } = useCommunityStore();

  const firstName = profile?.name?.split(' ')[0] ?? 'Corredor';
  const userId = user?.id;

  // ── Data fetching ──
  useEffect(() => {
    if (!userId) return;
    fetchTopMembers();
    fetchMyCounts(userId);
    fetchFriends(userId, userId);
    fetchRuns(userId);
  }, [userId]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchTopMembers();
      fetchMyCounts(userId);
    }, [userId])
  );

  // ── Derived data ──
  const weeklyProgress = weeklyGoal > 0 ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0;
  const lastRun = runs.length > 0 ? runs[0] : null;

  // Weekly time and pace from this week's runs
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    let totalTime = 0;
    let totalDist = 0;
    let runCount = 0;
    for (const run of runs) {
      if (new Date(run.activity_date) >= monday) {
        totalTime += run.moving_time_seconds;
        totalDist += run.distance_km;
        runCount++;
      }
    }
    const paceStr = totalDist > 0
      ? (() => { const p = (totalTime / totalDist) / 60; const m = Math.floor(p); const s = Math.floor((p - m) * 60); return `${m}:${s.toString().padStart(2, '0')}`; })()
      : '--';
    const timeStr = totalTime > 0
      ? (() => { const h = Math.floor(totalTime / 3600); const m = Math.floor((totalTime % 3600) / 60); return h > 0 ? `${h}h${m}min` : `${m}min`; })()
      : '--';
    return { pace: paceStr, time: timeStr, runCount };
  }, [runs]);

  // Top 3 members for rank
  const rankMembers = useMemo(() => topMembers.slice(0, 3), [topMembers]);

  // Partners (friends / mutual follows)
  const partners = useMemo(() => friends.slice(0, 8), [friends]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <Animated.ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    >
      {/* ══════════════════════════════════════
           1. HEADER
         ══════════════════════════════════════ */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View>
          <Logo variant="gradient" size="sm" />
          <Text style={styles.greeting}>Ola, {firstName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/perfil')}
          style={styles.avatarBtn}
          activeOpacity={0.8}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <LinearGradient
                colors={['#FF6C24', '#FFAC7D']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ══════════════════════════════════════
           2. HERO STATS
         ══════════════════════════════════════ */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/perfil')}
          style={[styles.heroCard, webHeroGlass]}
        >
          <LinearGradient
            colors={['rgba(255,108,36,0.14)', 'rgba(255,133,64,0.06)', 'rgba(255,172,125,0.10)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {!isWeb && <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />}
          {/* Specular top highlight */}
          <LinearGradient
            colors={['transparent', 'rgba(255,200,170,0.35)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.specular}
          />

          <View style={styles.heroStatsRow}>
            {/* Sparks */}
            <View style={styles.heroStatCol}>
              <View style={styles.heroStatIconRow}>
                <LottieView source={THUNDER_ANIM} autoPlay loop style={styles.heroLottie} />
                <Text style={styles.heroStatValue}>{profile?.points_balance ?? 0}</Text>
              </View>
              <Text style={styles.heroStatLabel}>sparks</Text>
            </View>

            {/* Divider */}
            <View style={styles.heroDivider} />

            {/* Corridas */}
            <View style={styles.heroStatCol}>
              <View style={styles.heroStatIconRow}>
                <LottieView source={RUNNING_ANIM} autoPlay loop style={styles.heroLottieRunner} />
                <Text style={styles.heroStatValue}>{lifetimeRunCount}</Text>
              </View>
              <Text style={styles.heroStatLabel}>corridas</Text>
            </View>

            {/* Divider */}
            <View style={styles.heroDivider} />

            {/* Streak */}
            <View style={styles.heroStatCol}>
              <View style={styles.heroStatIconRow}>
                <LottieView source={FIRE_ANIM} autoPlay loop style={styles.heroLottie} />
                <Text style={styles.heroStatValue}>{profile?.streak_days ?? 0}</Text>
              </View>
              <Text style={styles.heroStatLabel}>streak</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>


      {/* ══════════════════════════════════════
           EVENTOS PARCEIROS
         ══════════════════════════════════════ */}
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Eventos Parceiros</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_W - 26}
          snapToAlignment="start"
          contentContainerStyle={{ paddingRight: 20, gap: 14 }}
        >
          {/* Event: Kurv Klub */}
          <TouchableOpacity activeOpacity={0.9} style={styles.eventoParceiro}>
            {/* Background image */}
            <Image
              source={require('../../assets/kurv-event-bg.png')}
              style={[StyleSheet.absoluteFill, { transform: [{ scale: 0.75 }, { translateX: -160 }, { translateY: -100 }] }]}
              resizeMode="cover"
            />
            {/* Dark gradient overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.3, 0.6, 0.85]}
              style={StyleSheet.absoluteFill}
            />

            {/* Content */}
            <View style={styles.epContent}>
              {/* Logo + info */}
              <View style={styles.epTopRow}>
                <Image source={require('../../assets/kukur-logo.png')} style={styles.epLogo} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.epOrg}>KURVA KLUB</Text>
                  <Text style={styles.epTitle}>Corrida Noturna Fortaleza</Text>
                </View>
                <View style={styles.epDateBadge}>
                  <Text style={styles.epDateDay}>22</Text>
                  <Text style={styles.epDateMonth}>MAR</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.epDetailsRow}>
                <View style={styles.epDetail}>
                  <Text style={styles.epDetailValue}>5km</Text>
                  <Text style={styles.epDetailLabel}>trajeto</Text>
                </View>
                <View style={styles.epDetailDivider} />
                <View style={styles.epDetail}>
                  <Text style={styles.epDetailValue}>20h</Text>
                  <Text style={styles.epDetailLabel}>largada</Text>
                </View>
                <View style={styles.epDetailDivider} />
                <View style={styles.epDetail}>
                  <Text style={styles.epDetailValue}>Beira-Mar</Text>
                  <Text style={styles.epDetailLabel}>local</Text>
                </View>
              </View>

              {/* Participants + CTA */}
              <View style={styles.epBottomRow}>
                <View style={styles.epParticipants}>
                  <View style={[styles.epAvatar, { backgroundColor: '#FF6C24' }]} />
                  <View style={[styles.epAvatar, { backgroundColor: '#FF8540', marginLeft: -10 }]} />
                  <View style={[styles.epAvatar, { backgroundColor: '#FFAC7D', marginLeft: -10 }]} />
                  <View style={[styles.epAvatar, { backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: -10 }]} />
                  <Text style={styles.epParticipantsText}>+23 parceiros</Text>
                </View>
                <View style={styles.epCtaBtn}>
                  <LinearGradient
                    colors={['#FF6C24', '#FF8540']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.epCtaText}>Participar</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Event 2: Sunrise Run */}
          <TouchableOpacity activeOpacity={0.9} style={styles.eventoParceiro}>
            <Image
              source={require('../../assets/sunrise-event-bg.jpg')}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.35, 0.8]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.epContent}>
              <View style={styles.epTopRow}>
                <LottieView source={SUNSET_ANIM} autoPlay loop speed={0.6} style={{ width: 36, height: 36 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.epOrg}>VITTA UP</Text>
                  <Text style={styles.epTitle}>Sunrise Run</Text>
                </View>
                <View style={styles.epDateBadge}>
                  <Text style={styles.epDateDay}>29</Text>
                  <Text style={styles.epDateMonth}>MAR</Text>
                </View>
              </View>
              <View style={styles.epDetailsRow}>
                <View style={styles.epDetail}>
                  <Text style={styles.epDetailValue}>10km</Text>
                  <Text style={styles.epDetailLabel}>trajeto</Text>
                </View>
                <View style={styles.epDetailDivider} />
                <View style={styles.epDetail}>
                  <Text style={styles.epDetailValue}>5h30</Text>
                  <Text style={styles.epDetailLabel}>largada</Text>
                </View>
                <View style={styles.epDetailDivider} />
                <View style={styles.epDetail}>
                  <Text style={styles.epDetailValue}>Praia</Text>
                  <Text style={styles.epDetailLabel}>local</Text>
                </View>
              </View>
              <View style={styles.epBottomRow}>
                <View style={styles.epParticipants}>
                  <View style={[styles.epAvatar, { backgroundColor: '#FF8540' }]} />
                  <View style={[styles.epAvatar, { backgroundColor: '#FFAC7D', marginLeft: -10 }]} />
                  <Text style={styles.epParticipantsText}>+8 parceiros</Text>
                </View>
                <View style={[styles.epCtaBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={[styles.epCtaText, { color: 'rgba(255,255,255,0.6)' }]}>Em breve</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* ══════════════════════════════════════
           3. META DA SEMANA
         ══════════════════════════════════════ */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/perfil')}
          style={styles.weeklyHero}
        >
          {/* Deep black base */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
          {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
          {/* Glass gradient */}
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.0)', 'rgba(255,255,255,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Specular top */}
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'transparent']}
            style={styles.weeklySpecular}
          />

          {stravaConnected ? (
            <View style={{ padding: 20, zIndex: 2 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <LottieView source={CALENDAR_ANIM} autoPlay loop={false} speed={0.6} style={{ width: 26, height: 26 }} />
                <Text style={{ fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 16 }}>Meta Semanal</Text>
              </View>

              {/* Total + Progress */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 32 }}>
                  {weeklyTotal.toFixed(1)}
                  <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.5)', fontSize: 18 }}> km</Text>
                </Text>
                <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                  de {weeklyGoal} km
                </Text>
              </View>

              {/* Progress bar with runner */}
              <View style={{ position: 'relative', paddingTop: 50, marginBottom: 8 }}>
                <View style={[{ position: 'absolute', top: 0, width: 60, height: 60, zIndex: 5 }, weeklyProgress >= 100 ? { right: -16 } : { left: `${Math.max(weeklyProgress - 8, -6)}%` }]}>
                  <LottieView
                    source={weeklyProgress >= 100 ? CELEBRATION_ANIM : RUNNING_ANIM}
                    autoPlay loop
                    speed={weeklyProgress >= 100 ? 0.8 : 1.2}
                    style={{ width: 60, height: 60 }}
                  />
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <LinearGradient
                    colors={['#FF6C24', '#FF8540', '#FFAC7D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 6, borderRadius: 3, width: `${weeklyProgress}%` }}
                  />
                </View>
              </View>

              {/* Daily bars */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
                {weeklyKm.map((km: number, i: number) => {
                  const maxBar = Math.max(...weeklyKm, 1);
                  const barH = km > 0 ? Math.max((km / maxBar) * 60, 6) : 4;
                  const isToday = i === (new Date().getDay() + 6) % 7;
                  const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ height: 64, justifyContent: 'flex-end', marginBottom: 6 }}>
                        {km > 0 ? (
                          <LinearGradient
                            colors={isToday ? ['#FF6C24', '#FF8540'] : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
                            style={{ width: 20, borderRadius: 6, height: barH, minHeight: 4 }}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                          />
                        ) : (
                          <View style={{ width: 20, borderRadius: 6, height: barH, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                        )}
                      </View>
                      <Text style={{ fontFamily: FONTS.montserrat.medium, color: isToday ? '#FF8540' : 'rgba(255,255,255,0.25)', fontSize: 10 }}>{dayLabels[i]}</Text>
                      {km > 0 && <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 2 }}>{km.toFixed(1)}</Text>}
                    </View>
                  );
                })}
              </View>

              {/* Stats: tempo · pace · corridas */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 15 }}>{weeklyStats.time}</Text>
                  <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>tempo</Text>
                </View>
                <View style={{ width: 0.5, height: 26, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 15 }}>{weeklyStats.pace}/km</Text>
                  <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>pace medio</Text>
                </View>
                <View style={{ width: 0.5, height: 26, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 15 }}>{weeklyStats.runCount}</Text>
                  <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>corridas</Text>
                </View>
              </View>

              {/* Strava badge — centered bottom */}
              <View style={{ alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Svg width={10} height={10} viewBox="0 0 16 16" fill="rgba(252,82,0,0.5)">
                    <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                  </Svg>
                  <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>powered by </Text>
                  <Text style={{ fontFamily: FONTS.montserrat.semibold, color: 'rgba(252,82,0,0.5)', fontSize: 9 }}>Strava</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 2 }}>
              <LottieView source={RUNNING_ANIM} autoPlay loop speed={1} style={{ width: 56, height: 56 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 17 }}>Conecte seu Strava</Text>
                <Text style={{ fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>Veja seus km, pace e meta semanal</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ══════════════════════════════════════
           4. RANK DA SEMANA
         ══════════════════════════════════════ */}
      {rankMembers.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <GlassCard variant="medium" style={styles.rankCard}>
            <View style={styles.rankCardContent}>
              {/* Title */}
              <View style={styles.rankHeader}>
                <LottieView source={MEDAL_ANIM} autoPlay loop style={styles.rankTrophyLottie} />
                <Text style={styles.rankTitle}>Rank da Semana</Text>
              </View>

              {/* Rows */}
              {rankMembers.map((member, i) => (
                <TouchableOpacity
                  key={member.user_id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/user/${member.user_id}` as any)}
                  style={[styles.rankRow, i === 0 && styles.rankRowFirst]}
                >
                  {i === 0 && (
                    <LinearGradient
                      colors={['rgba(255,108,36,0.15)', 'rgba(255,108,36,0.04)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  {/* Rank number */}
                  <View style={[styles.rankBadge, i === 0 && styles.rankBadgeGold, i === 1 && styles.rankBadgeSilver, i === 2 && styles.rankBadgeBronze]}>
                    <Text style={[styles.rankBadgeText, i === 0 && styles.rankBadgeTextGold]}>
                      {i + 1}
                    </Text>
                  </View>

                  {/* Avatar */}
                  {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={styles.rankAvatar} />
                  ) : (
                    <View style={styles.rankAvatarFallback}>
                      <LinearGradient
                        colors={['#FF6C24', '#FFAC7D']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Text style={styles.rankAvatarInitial}>
                        {(member.user_name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Name */}
                  <Text style={styles.rankName} numberOfLines={1}>
                    {member.user_name?.split(' ')[0] || 'Corredor'}
                  </Text>

                  {/* Weekly km */}
                  <Text style={[styles.rankKm, i === 0 && styles.rankKmGold]}>
                    {member.weekly_km.toFixed(1)}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════
           5. PARCEIROS
         ══════════════════════════════════════ */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parceiros</Text>
          {partners.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push(`/social/friends?userId=${userId}` as any)}
              style={styles.seeAllBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ChevronRight size={12} color="#FF8540" />
            </TouchableOpacity>
          )}
        </View>

        {partners.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.partnersScroll}
          >
            {partners.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/user/${p.id}` as any)}
                style={styles.partnerItem}
              >
                {p.avatar_url ? (
                  <Image source={{ uri: p.avatar_url }} style={styles.partnerAvatar} />
                ) : (
                  <View style={styles.partnerAvatarFallback}>
                    <LinearGradient
                      colors={['#FF6C24', '#FFAC7D']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Text style={styles.partnerInitial}>
                      {(p.name || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.partnerNameRow}>
                  <Text style={styles.partnerName} numberOfLines={1}>
                    {p.name?.split(' ')[0] || '...'}
                  </Text>
                  {p.is_verified && <VerifiedBadge size={10} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Add partner button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/social/search' as any)}
              style={styles.partnerItem}
            >
              <View style={styles.partnerAddBtn}>
                <PlusIcon size={22} color="#FF6C24" />
              </View>
              <Text style={styles.partnerName}>Buscar</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* Empty state */
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/social/search' as any)}
          >
            <GlassCard variant="light" style={styles.emptyCard}>
              <View style={styles.emptyCardContent}>
                <LottieView source={HIKER_ANIM} autoPlay loop style={styles.emptyLottie} />
                <View style={styles.emptyTextCol}>
                  <Text style={styles.emptyTitle}>Encontre parceiros</Text>
                  <Text style={styles.emptyDesc}>
                    Corra com amigos e acompanhem o progresso juntos
                  </Text>
                </View>
                <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ══════════════════════════════════════
           DESAFIOS
         ══════════════════════════════════════ */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Desafios</Text>
          <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20, gap: 14 }}
        >
          {/* Event 1 */}
          <TouchableOpacity activeOpacity={0.85} style={styles.eventCard}>
            <LinearGradient
              colors={['rgba(255,108,36,0.18)', 'rgba(255,133,64,0.06)', 'rgba(0,0,0,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
            <LinearGradient
              colors={['transparent', 'rgba(255,200,170,0.2)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1 }}
            />
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>ATIVO</Text>
            </View>
            <LottieView source={RUN100_ANIM} autoPlay loop speed={0.8} style={styles.eventLottie} />
            <Text style={styles.eventTitle}>Desafio 100km</Text>
            <Text style={styles.eventSub}>Marco · 15 participantes</Text>
            <View style={styles.eventBarBg}>
              <LinearGradient
                colors={['#FF6C24', '#FFAC7D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.eventBarFill, { width: '67%' }]}
              />
            </View>
            <Text style={styles.eventProgress}>67/100km</Text>
          </TouchableOpacity>

          {/* Event 2 */}
          <TouchableOpacity activeOpacity={0.85} style={styles.eventCard}>
            <LinearGradient
              colors={['rgba(255,172,125,0.14)', 'rgba(255,108,36,0.04)', 'rgba(0,0,0,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
            <LinearGradient
              colors={['transparent', 'rgba(255,200,170,0.15)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1 }}
            />
            <View style={[styles.eventBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[styles.eventBadgeText, { color: 'rgba(255,255,255,0.5)' }]}>EM BREVE</Text>
            </View>
            <LottieView source={MOON_ANIM} autoPlay loop speed={0.8} style={styles.eventLottie} />
            <Text style={styles.eventTitle}>Corrida Noturna</Text>
            <Text style={styles.eventSub}>22 Mar · Fortaleza</Text>
            <View style={styles.eventParticipants}>
              <View style={[styles.eventAvatar, { backgroundColor: '#FF6C24' }]} />
              <View style={[styles.eventAvatar, { backgroundColor: '#FF8540', marginLeft: -8 }]} />
              <View style={[styles.eventAvatar, { backgroundColor: '#FFAC7D', marginLeft: -8 }]} />
              <Text style={styles.eventParticipantsText}>+8</Text>
            </View>
          </TouchableOpacity>

          {/* Event 3 */}
          <TouchableOpacity activeOpacity={0.85} style={styles.eventCard}>
            <LinearGradient
              colors={['rgba(255,133,64,0.12)', 'rgba(0,0,0,0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
            <View style={[styles.eventBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[styles.eventBadgeText, { color: 'rgba(255,255,255,0.5)' }]}>ABERTO</Text>
            </View>
            <LottieView source={FIRE_ANIM} autoPlay loop speed={0.8} style={styles.eventLottie} />
            <Text style={styles.eventTitle}>Streak 30 Dias</Text>
            <Text style={styles.eventSub}>Corra todos os dias</Text>
            <View style={styles.eventParticipants}>
              <View style={[styles.eventAvatar, { backgroundColor: '#FF6C24' }]} />
              <View style={[styles.eventAvatar, { backgroundColor: '#FFAC7D', marginLeft: -8 }]} />
              <Text style={styles.eventParticipantsText}>+3</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
      {/* ══════════════════════════════════════
           6. ULTIMA CORRIDA
         ══════════════════════════════════════ */}
      {lastRun && (
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Ultima Corrida</Text>
            <Text style={styles.sectionTime}>{timeAgo(lastRun.activity_date)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/corridas')}
          >
            <GlassCard variant="medium" style={styles.lastRunCard}>
              <View style={styles.lastRunCardContent}>
                {/* Activity name */}
                <Text style={styles.lastRunName} numberOfLines={1}>
                  {lastRun.activity_name}
                </Text>

                {/* Stats row */}
                <View style={styles.lastRunStats}>
                  <View style={styles.lastRunStat}>
                    <Text style={styles.lastRunStatValue}>
                      {lastRun.distance_km.toFixed(1)}km
                    </Text>
                    <Text style={styles.lastRunStatLabel}>distancia</Text>
                  </View>
                  <View style={styles.lastRunStatDivider} />
                  <View style={styles.lastRunStat}>
                    <Text style={styles.lastRunStatValue}>
                      {formatMovingTime(lastRun.moving_time_seconds)}
                    </Text>
                    <Text style={styles.lastRunStatLabel}>tempo</Text>
                  </View>
                  <View style={styles.lastRunStatDivider} />
                  <View style={styles.lastRunStat}>
                    <Text style={styles.lastRunStatValue}>
                      {formatPace(lastRun.average_speed)}/km
                    </Text>
                    <Text style={styles.lastRunStatLabel}>pace</Text>
                  </View>
                  <View style={styles.lastRunStatDivider} />
                  <View style={styles.lastRunStat}>
                    <View style={styles.sparksRow}>
                      <LottieView source={THUNDER_ANIM} autoPlay loop style={{ width: 16, height: 16 }} />
                      <Text style={styles.lastRunSparksValue}>+{lastRun.sparks_awarded}</Text>
                    </View>
                    <Text style={styles.lastRunStatLabel}>sparks</Text>
                  </View>
                </View>

                {/* Route preview */}
                {lastRun.summary_polyline && (
                  <View style={styles.lastRunMap}>
                    <RoutePreview
                      polyline={lastRun.summary_polyline}
                      width={SCREEN_W - 80}
                      height={100}
                      showMap
                    />
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.lastRunActions}>
                  <TouchableOpacity
                    style={styles.lastRunActionBtn}
                    activeOpacity={0.7}
                    onPress={() => router.push('/(tabs)/comunidade')}
                  >
                    <LinearGradient
                      colors={['#FF6C24', '#FF8540']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.lastRunActionTextPrimary}>Postar no Social</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.lastRunActionBtnSecondary}
                    activeOpacity={0.7}
                  >
                    <ShareIcon size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.lastRunActionTextSecondary}>Compartilhar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      )}

    </Animated.ScrollView>
  );
}

// ══════════════════════════════════════
// ══ STYLES ══
// ══════════════════════════════════════

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 4,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FF6C24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 16,
    zIndex: 1,
  },

  // ── Specular highlight ──
  specular: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: 1,
    zIndex: 5,
  },

  // ── Hero Stats ──
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,140,100,0.2)',
    marginBottom: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    shadowColor: '#FF6C24',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 2,
  },
  heroStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLottie: {
    width: 28,
    height: 28,
  },
  heroLottieRunner: {
    width: 32,
    height: 32,
    marginRight: -4,
  },
  heroStatValue: {
    fontFamily: FONTS.montserrat.extrabold,
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
  },
  heroStatLabel: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── Weekly Goal ──
  // Weekly Hero Card (Meta Semanal)
  weeklyHero: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)', marginBottom: 16, paddingBottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 20,
  },
  weeklySpecular: {
    position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, zIndex: 5,
  },
  weeklyContent: {
    flexDirection: 'row', alignItems: 'center', gap: 18, zIndex: 2,
  },
  weeklyRing: {
    width: 76, height: 76, justifyContent: 'center', alignItems: 'center',
  },
  weeklyRingInner: {
    position: 'absolute', justifyContent: 'center', alignItems: 'center',
  },
  weeklyRingPct: {
    fontFamily: FONTS.montserrat.bold, color: '#FFAC7D', fontSize: 14,
  },
  weeklyText: { flex: 1 },
  weeklyLabel: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.4)',
    fontSize: 11, letterSpacing: 1.5,
  },
  weeklyTitle: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 18, marginTop: 4,
  },
  weeklyTitleUnit: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)', fontSize: 13,
  },
  weeklySub: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2,
  },
  weeklyBarRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
  },
  weeklyBarBg: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  weeklyBarFill: {
    height: '100%', borderRadius: 2,
  },
  weeklyStatsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14,
    paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  weeklyStatItem: { flex: 1, alignItems: 'center' },
  weeklyStatValue: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 14,
  },
  weeklyStatLabel: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 3,
  },
  weeklyStatDivider: {
    width: 0.5, height: 24, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  weeklyBarsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 4,
  },
  weeklyBarCol: { flex: 1, alignItems: 'center' },
  weeklyBarWrap: { height: 44, justifyContent: 'flex-end', marginBottom: 4 },
  weeklyDayBar: { width: 16, borderRadius: 4, minHeight: 3 },
  weeklyDayLabel: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.25)', fontSize: 9,
  },
  weeklyRunnerFloat: {
    position: 'absolute', right: 8, bottom: 4, zIndex: 3, opacity: 0.8,
  },
  // ── Eventos Parceiros ──
  eventoParceiro: {
    width: SCREEN_W - 40, height: 280, borderRadius: 20, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, marginBottom: 16,
  },
  epContent: { padding: 14, zIndex: 2, flex: 1, justifyContent: 'flex-end' },
  epTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  epLogo: { width: 36, height: 36, borderRadius: 10 },
  epOrg: {
    fontFamily: FONTS.montserrat.bold, color: 'rgba(255,255,255,0.4)',
    fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
  },
  epTitle: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 14, marginTop: 1,
  },
  epDateBadge: {
    alignItems: 'center', backgroundColor: 'rgba(255,108,36,0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.25)',
  },
  epDateDay: {
    fontFamily: FONTS.montserrat.bold, color: '#FF6C24', fontSize: 15, lineHeight: 17,
  },
  epDateMonth: {
    fontFamily: FONTS.montserrat.semibold, color: '#FF8540', fontSize: 9,
  },
  epDetailsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 0.5, borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  epDetail: { flex: 1, alignItems: 'center' },
  epDetailValue: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 12,
  },
  epDetailLabel: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)',
    fontSize: 9, marginTop: 1,
  },
  epDetailDivider: {
    width: 0.5, height: 24, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  epBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8,
  },
  epParticipants: {
    flexDirection: 'row', alignItems: 'center',
  },
  epAvatar: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  epParticipantsText: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.4)',
    fontSize: 10, marginLeft: 5,
  },
  epCtaBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    overflow: 'hidden',
  },
  epCtaText: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 11,
  },

  // ── Events ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: FONTS.playfair.semibold, color: '#fff', fontSize: 20,
  },
  seeAllBtn: { minHeight: 44, justifyContent: 'center' },
  seeAllText: {
    fontFamily: FONTS.montserrat.medium, color: '#FF8540', fontSize: 12,
  },
  eventCard: {
    width: 200, height: 160, borderRadius: 18, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.10)',
    padding: 16, justifyContent: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20,
  },
  eventBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,108,36,0.2)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  eventBadgeText: {
    fontFamily: FONTS.montserrat.bold, color: '#FF6C24', fontSize: 9,
    letterSpacing: 0.5,
  },
  eventLottie: {
    width: 44, height: 44, marginBottom: 8,
  },
  eventTitle: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 15,
  },
  eventSub: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.4)',
    fontSize: 11, marginTop: 3,
  },
  eventBarBg: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden', marginTop: 10,
  },
  eventBarFill: {
    height: '100%', borderRadius: 2,
  },
  eventProgress: {
    fontFamily: FONTS.montserrat.semibold, color: '#FFAC7D', fontSize: 10,
    marginTop: 4,
  },
  eventParticipants: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4,
  },
  eventAvatar: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  eventParticipantsText: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.4)',
    fontSize: 11, marginLeft: 4,
  },

  // ── Rank ──
  rankCard: { marginBottom: 20 },
  rankCardContent: { paddingVertical: 16 },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  rankTrophyLottie: { width: 28, height: 28 },
  rankTitle: {
    fontFamily: FONTS.montserrat.semibold,
    color: '#fff',
    fontSize: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
    overflow: 'hidden',
    borderRadius: 8,
  },
  rankRowFirst: {
    borderRadius: 10,
    marginHorizontal: 6,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeGold: { backgroundColor: 'rgba(255,108,36,0.25)' },
  rankBadgeSilver: { backgroundColor: 'rgba(255,255,255,0.08)' },
  rankBadgeBronze: { backgroundColor: 'rgba(255,172,125,0.12)' },
  rankBadgeText: {
    fontFamily: FONTS.montserrat.bold,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  rankBadgeTextGold: { color: '#FF6C24' },
  rankAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  rankAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankAvatarInitial: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 11,
    zIndex: 1,
  },
  rankName: {
    flex: 1,
    fontFamily: FONTS.montserrat.semibold,
    color: '#fff',
    fontSize: 13,
  },
  rankKm: {
    fontFamily: FONTS.montserrat.bold,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  rankKmGold: { color: '#FFAC7D' },

  sectionTime: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
  },

  // ── Partners ──
  partnersScroll: {
    paddingRight: 20,
    gap: 16,
    marginBottom: 24,
  },
  partnerItem: {
    alignItems: 'center',
    width: 56,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,108,36,0.25)',
  },
  partnerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,108,36,0.25)',
  },
  partnerInitial: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 14,
    zIndex: 1,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  partnerName: {
    fontFamily: FONTS.montserrat.medium,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
  },
  partnerAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,108,36,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,108,36,0.06)',
  },

  // ── Empty state ──
  emptyCard: { marginBottom: 24 },
  emptyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  emptyLottie: { width: 48, height: 48 },
  emptyTextCol: { flex: 1 },
  emptyTitle: {
    fontFamily: FONTS.montserrat.semibold,
    color: '#fff',
    fontSize: 13,
  },
  emptyDesc: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Last Run ──
  lastRunCard: { marginBottom: 20 },
  lastRunCardContent: { padding: 18 },
  lastRunName: {
    fontFamily: FONTS.montserrat.semibold,
    color: '#fff',
    fontSize: 15,
    marginBottom: 14,
  },
  lastRunStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  lastRunStat: {
    alignItems: 'center',
    flex: 1,
  },
  lastRunStatValue: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 14,
  },
  lastRunStatLabel: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastRunStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sparksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lastRunSparksValue: {
    fontFamily: FONTS.montserrat.bold,
    color: '#FF6C24',
    fontSize: 14,
  },
  lastRunMap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  lastRunActions: {
    flexDirection: 'row',
    gap: 10,
  },
  lastRunActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastRunActionTextPrimary: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 12,
    zIndex: 1,
  },
  lastRunActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
  },
  lastRunActionTextSecondary: {
    fontFamily: FONTS.montserrat.semibold,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  // ── Events placeholder ──
  eventsCard: { marginBottom: 20 },
  eventsCardContent: {
    padding: 18,
    overflow: 'hidden',
    borderRadius: 16,
  },
  eventsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 2,
  },
  eventsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,108,36,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsTextCol: { flex: 1 },
  eventsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventsTitle: {
    fontFamily: FONTS.montserrat.semibold,
    color: '#fff',
    fontSize: 14,
  },
  eventsBadge: {
    backgroundColor: 'rgba(255,108,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventsBadgeText: {
    fontFamily: FONTS.montserrat.medium,
    color: '#FF8540',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventsDesc: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
});

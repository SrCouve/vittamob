import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { GlassCard } from '../../src/components/GlassCard';
import LottieView from 'lottie-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useUserStore } from '../../src/stores/userStore';
import { useStravaStore, STRAVA_CLIENT_ID } from '../../src/stores/stravaStore';
import { useSocialStore } from '../../src/stores/socialStore';
import { CorridasContent, RecordsContent } from './corridas';

// Lazy-load native modules (not available in Expo Go)
let AuthSession: typeof import('expo-auth-session') | null = null;
let WebBrowser: typeof import('expo-web-browser') | null = null;
try {
  AuthSession = require('expo-auth-session');
  WebBrowser = require('expo-web-browser');
  WebBrowser?.maybeCompleteAuthSession();
} catch {
  // Running in Expo Go — Strava OAuth won't work
}

const RUNNING_ANIM = require('../../assets/running.json');
const HEIGHT_ANIM = require('../../assets/height.json');
const SCALE_ANIM = require('../../assets/kitchen-scale.json');
const FIRE_ANIM = require('../../assets/fire-emoji.json');
const CELEBRATION_ANIM = require('../../assets/celebration.json');

const { width: SW } = Dimensions.get('window');

// ── Icons ──
function SettingsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

function EditIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <Path d="m15 5 4 4" />
    </Svg>
  );
}

function LogOutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}

function ScaleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8" />
      <Path d="M12 17V3" />
      <Path d="m6 7 6-4 6 4" />
      <Path d="M3 13a1 1 0 0 0 0 2l3-6-3 4Z" />
      <Path d="M21 13a1 1 0 0 1 0 2l-3-6 3 4Z" />
    </Svg>
  );
}

function RulerIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFAC7D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <Path d="m14.5 12.5 2-2" />
      <Path d="m11.5 9.5 2-2" />
      <Path d="m8.5 6.5 2-2" />
      <Path d="m17.5 15.5 2-2" />
    </Svg>
  );
}

function RunIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FF8540" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="17" cy="4" r="2" />
      <Path d="M15.59 13.51 12 17l-3-3 4-4 1.59 1.51Z" />
      <Path d="m8 14-2 4" />
      <Path d="m12 17 2 4" />
      <Path d="M16 8s4-2 5 3" />
      <Path d="M9 5s-4 2-5 3" />
    </Svg>
  );
}

function FireIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Strava OAuth discovery
const stravaDiscovery = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
  revocationEndpoint: 'https://www.strava.com/oauth/deauthorize',
};

// ── Profile Tab Types ──
type ProfileTab = 'perfil' | 'corridas' | 'records';

function SparkIcon({ size = 14, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

// ══════════════════════════════════════
export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuthStore();
  const { profile } = useUserStore();
  const strava = useStravaStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('perfil');
  const { myFollowersCount, myFollowingCount, myFriendsCount, fetchMyCounts, followRequestsCount, fetchFollowRequests } = useSocialStore();

  const displayName = profile?.name ?? 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();
  const bio = profile?.bio ?? 'Membro VITTA UP';

  // Social stats (real counts from socialStore)
  const followers = myFollowersCount;
  const following = myFollowingCount;
  const friends = myFriendsCount;

  // Fetch social counts + follow requests on mount and when screen regains focus
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchMyCounts(session.user.id);
        if (profile?.is_private) {
          fetchFollowRequests(session.user.id);
        }
      }
    }, [session?.user?.id, profile?.is_private])
  );

  // Body stats (from profile, editable)
  const weight = profile?.weight_kg ?? null;
  const height = profile?.height_cm ?? null;
  const streakDays = profile?.streak_days ?? 0;

  // Strava data (real when connected, zeros when not)
  const weeklyKm = strava.isConnected ? strava.weeklyKm : [0, 0, 0, 0, 0, 0, 0];
  const weeklyTotal = strava.isConnected ? strava.weeklyTotal : 0;
  const weeklyGoal = strava.weeklyGoal;
  const weeklyProgress = weeklyGoal > 0 ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0;
  const maxBar = Math.max(...weeklyKm, 1);

  // Strava OAuth via in-app browser
  const handleStravaConnect = async () => {
    if (!WebBrowser) {
      Alert.alert('Indisponível', 'Strava OAuth requer um build nativo.');
      return;
    }
    // vittaup.fit middleware does a 302 redirect to vittaup:// deep link
    const redirectUri = 'https://vittaup.fit/auth/strava/callback';
    const authUrl =
      `https://www.strava.com/oauth/mobile/authorize` +
      `?client_id=${STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&approval_prompt=auto` +
      `&scope=read,activity:read_all,profile:read_all`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, 'vittaup://');
    if (result.type === 'success' && result.url) {
      const codeMatch = result.url.match(/[?&]code=([^&]+)/);
      const code = codeMatch?.[1];
      if (code && session?.user?.id) {
        strava.connectStrava(code, session.user.id);
      }
    }
  };

  // Auto-sync Strava when opening profile
  useEffect(() => {
    if (strava.isConnected && !strava.isSyncing) {
      strava.syncAllStats();
    }
  }, [strava.isConnected]);

  // Lottie refs: play 2x on mount, then static. Tap to play once.
  const heightRef = useRef<LottieView>(null);
  const heightPlays = useRef(0);
  const scaleRef = useRef<LottieView>(null);
  const scalePlays = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => heightRef.current?.play(), 300);
    const t2 = setTimeout(() => scaleRef.current?.play(), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const onHeightAnimFinish = (isCancelled: boolean) => {
    if (isCancelled) return;
    heightPlays.current += 1;
    if (heightPlays.current < 2) heightRef.current?.play();
  };
  const onHeightTap = () => heightRef.current?.play();

  const onScaleAnimFinish = (isCancelled: boolean) => {
    if (isCancelled) return;
    scalePlays.current += 1;
    if (scalePlays.current < 2) scaleRef.current?.play();
  };
  const onScaleTap = () => scaleRef.current?.play();

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.pageTitle}>Perfil</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/editar-perfil' as any)}
          >
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Profile Card ── */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)}>
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileTop}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                <LinearGradient
                  colors={['#FF6C24', '#FF8540', '#FFAC7D']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
              <View style={styles.avatarInner}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <>
                    <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    <Text style={styles.avatarText}>{initial}</Text>
                  </>
                )}
              </View>
            </View>

            {/* Name & Bio */}
            <View style={styles.nameSection}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userBio} numberOfLines={2}>{bio}</Text>

              {/* Streak badge */}
              <View style={styles.streakBadge}>
                <FireIcon />
                <Text style={styles.streakText}>{streakDays} dias de streak</Text>
              </View>
            </View>
          </View>

          {/* Social stats row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialStat} activeOpacity={0.7} onPress={() => router.push(`/social/followers?userId=${session?.user?.id}&userName=${encodeURIComponent(profile?.name || '')}` as any)}>
              <Text style={styles.socialValue}>{followers}</Text>
              <Text style={styles.socialLabel}>Apoiadores</Text>
            </TouchableOpacity>
            <View style={styles.socialDivider} />
            <TouchableOpacity style={styles.socialStat} activeOpacity={0.7} onPress={() => router.push(`/social/following?userId=${session?.user?.id}&userName=${encodeURIComponent(profile?.name || '')}` as any)}>
              <Text style={styles.socialValue}>{following}</Text>
              <Text style={styles.socialLabel}>Apoiando</Text>
            </TouchableOpacity>
            <View style={styles.socialDivider} />
            <TouchableOpacity style={styles.socialStat} activeOpacity={0.7} onPress={() => router.push(`/social/friends?userId=${session?.user?.id}&userName=${encodeURIComponent(profile?.name || '')}` as any)}>
              <Text style={styles.socialValue}>{friends}</Text>
              <Text style={styles.socialLabel}>Parceiros</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </Animated.View>

      {/* ── Follow Requests Banner ── */}
      {profile?.is_private && followRequestsCount > 0 && (
        <Animated.View entering={FadeInDown.delay(70).duration(400)}>
          <TouchableOpacity
            onPress={() => router.push('/social/requests' as any)}
            style={styles.requestsBanner}
            activeOpacity={0.7}
          >
            <View style={styles.requestsBannerIcon}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <Circle cx="9" cy="7" r="4" />
                <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestsBannerTitle}>
                Solicitacoes de apoio
              </Text>
              <Text style={styles.requestsBannerSubtitle}>
                {followRequestsCount} {followRequestsCount === 1 ? 'pessoa quer' : 'pessoas querem'} te apoiar
              </Text>
            </View>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Polyline points="9 18 15 12 9 6" />
            </Svg>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Tab Switcher ── */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.tabSwitcher}>
        {(['perfil', 'corridas', 'records'] as ProfileTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'perfil' ? 'Perfil' : tab === 'corridas' ? 'Corridas' : 'Records';
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            >
              {isActive && (
                <LinearGradient
                  colors={['rgba(255,108,36,0.2)', 'rgba(255,108,36,0.08)']}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {tab === 'corridas' && <SparkIcon size={13} color={isActive ? '#FF8540' : 'rgba(255,255,255,0.3)'} />}
              {tab === 'records' && (
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#FF8540' : 'rgba(255,255,255,0.3)'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M6 9a6 6 0 0 1 12 0c0 3-2 5.5-6 9-4-3.5-6-6-6-9z" />
                  <Circle cx="12" cy="9" r="2" />
                </Svg>
              )}
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── Tab Content ── */}
      {activeTab === 'corridas' ? (
        <CorridasContent userId={session?.user?.id ?? null} />
      ) : activeTab === 'records' ? (
        <RecordsContent userId={session?.user?.id ?? null} />
      ) : (
      <>
      {/* ── Body Stats ── */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.bodyStatsRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={onScaleTap} style={styles.bodyStatSlot}>
          <GlassCard style={styles.bodyStatCard}>
            <LottieView
              ref={scaleRef}
              source={SCALE_ANIM}
              loop={false}
              speed={0.8}
              style={styles.bodyStatLottie}
              onAnimationFinish={onScaleAnimFinish}
            />
            <Text style={styles.bodyStatValue}>
              {weight != null ? weight : '—'}<Text style={styles.bodyStatUnit}> kg</Text>
            </Text>
            <Text style={styles.bodyStatLabel}>Peso</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={onHeightTap} style={styles.bodyStatSlot}>
          <GlassCard style={styles.bodyStatCard}>
            <LottieView
              ref={heightRef}
              source={HEIGHT_ANIM}
              loop={false}
              speed={0.8}
              style={styles.bodyStatLottie}
              onAnimationFinish={onHeightAnimFinish}
            />
            <Text style={styles.bodyStatValue}>
              {height != null ? height : '—'}<Text style={styles.bodyStatUnit}> cm</Text>
            </Text>
            <Text style={styles.bodyStatLabel}>Altura</Text>
          </GlassCard>
        </TouchableOpacity>

        <View style={styles.bodyStatSlot}>
          <GlassCard style={styles.bodyStatCard}>
            <LottieView
              source={FIRE_ANIM}
              autoPlay
              loop
              speed={0.8}
              style={[styles.bodyStatLottie, { backgroundColor: 'transparent' }]}
              renderMode="AUTOMATIC"
            />
            <Text style={[styles.bodyStatValue, { color: '#FF6C24' }]}>
              {streakDays}
            </Text>
            <Text style={styles.bodyStatLabel}>dias streak</Text>
          </GlassCard>
        </View>
      </Animated.View>

      {/* ── Strava Section ── */}
      {!strava.isConnected ? (
        /* ── Connect Strava Card ── */
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <GlassCard style={styles.connectCard}>
            <View style={styles.connectTop}>
              <View style={styles.stravaLogoBig}>
                <Svg width={28} height={28} viewBox="0 0 16 16" fill="#FC5200">
                  <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.connectTitle}>Conecte seu Strava</Text>
                <Text style={styles.connectDesc}>
                  Veja suas corridas, pace, km semanais e histórico direto no seu perfil
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.connectBtn}
              activeOpacity={0.8}
              onPress={handleStravaConnect}
              disabled={strava.isLoading}
            >
              {strava.isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="#fff">
                    <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                  </Svg>
                  <Text style={styles.connectBtnText}>Conectar com Strava</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
      ) : (
        <>
          {/* ── Weekly Activity (Strava) ── */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <GlassCard style={styles.weeklyCard}>
              <View style={styles.weeklyHeader}>
                <View style={styles.weeklyTitleRow}>
                  <RunIcon />
                  <Text style={styles.weeklyTitle}>Meta Semanal</Text>
                </View>
                <TouchableOpacity
                  style={styles.stravaBadge}
                  activeOpacity={0.7}
                  onPress={() => strava.syncAllStats()}
                >
                  <Svg width={12} height={12} viewBox="0 0 16 16" fill="#FC5200">
                    <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                  </Svg>
                  <Text style={styles.stravaText}>{strava.isSyncing ? 'sincronizando...' : 'powered by '}</Text>
                  {!strava.isSyncing && <Text style={styles.stravaName}>Strava</Text>}
                </TouchableOpacity>
              </View>

              {/* Total & Progress */}
              <View style={styles.weeklyTotalRow}>
                <Text style={styles.weeklyTotalValue}>
                  {weeklyTotal.toFixed(1)}
                  <Text style={styles.weeklyTotalUnit}> km</Text>
                </Text>
                <Text style={styles.weeklyGoalText}>
                  de {weeklyGoal} km
                </Text>
              </View>

              {/* Progress bar with runner */}
              <View style={styles.progressWrap}>
                <View style={[styles.runnerWrap, { left: weeklyProgress >= 100 ? undefined : `${Math.max(weeklyProgress - 8, -6)}%`, right: weeklyProgress >= 100 ? -20 : undefined }]}>
                  <LottieView
                    source={weeklyProgress >= 100 ? CELEBRATION_ANIM : RUNNING_ANIM}
                    autoPlay
                    loop
                    speed={weeklyProgress >= 100 ? 0.8 : 1.2}
                    style={styles.runnerLottie}
                  />
                </View>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={['#FF6C24', '#FF8540', '#FFAC7D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${weeklyProgress}%` }]}
                  />
                </View>
              </View>

              {/* Daily bars */}
              <View style={styles.barsRow}>
                {weeklyKm.map((km, i) => {
                  const barH = km > 0 ? Math.max((km / maxBar) * 60, 6) : 4;
                  const isToday = i === (new Date().getDay() + 6) % 7;
                  return (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barWrap}>
                        {km > 0 ? (
                          <LinearGradient
                            colors={isToday ? ['#FF6C24', '#FF8540'] : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
                            style={[styles.bar, { height: barH }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                          />
                        ) : (
                          <View style={[styles.bar, { height: barH, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                        )}
                      </View>
                      <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>{DAYS[i]}</Text>
                      {km > 0 && <Text style={styles.barValue}>{km.toFixed(1)}</Text>}
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* ── Running Stats (Strava) ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <GlassCard style={styles.statsCard}>
              {/* Title */}
              <View style={styles.statsTitleRow}>
                <RunIcon />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statsTitle}>Sua Jornada</Text>
                  <Text style={styles.statsSubtitle}>histórico lifetime</Text>
                </View>
                <View style={styles.stravaBadge}>
                  <Svg width={12} height={12} viewBox="0 0 16 16" fill="#FC5200">
                    <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                  </Svg>
                  <Text style={styles.stravaText}>powered by </Text>
                  <Text style={styles.stravaName}>Strava</Text>
                </View>
              </View>

              {/* Hero row — total km + pace */}
              <View style={styles.statsHeroRow}>
                <View style={styles.statsHeroItem}>
                  <Text style={styles.statsHeroValue}>
                    {strava.lifetimeDistanceKm >= 1000
                      ? `${(strava.lifetimeDistanceKm / 1000).toFixed(1)}k`
                      : Math.round(strava.lifetimeDistanceKm).toLocaleString('pt-BR')}
                  </Text>
                  <Text style={styles.statsHeroUnit}>km total</Text>
                </View>
                <View style={styles.statsHeroDivider} />
                <View style={styles.statsHeroItem}>
                  <Text style={styles.statsHeroValue}>{strava.avgPace}</Text>
                  <Text style={styles.statsHeroUnit}>pace médio</Text>
                </View>
              </View>

              {/* Detail row */}
              <View style={styles.statsDetailRow}>
                <View style={styles.statsDetail}>
                  <Text style={styles.statsDetailValue}>{strava.lifetimeRunCount}</Text>
                  <Text style={styles.statsDetailLabel}>corridas</Text>
                </View>
                <View style={styles.statsDetailDot} />
                <View style={styles.statsDetail}>
                  <Text style={styles.statsDetailValue}>{strava.lifetimeMovingTimeHours}h</Text>
                  <Text style={styles.statsDetailLabel}>tempo</Text>
                </View>
                <View style={styles.statsDetailDot} />
                <View style={styles.statsDetail}>
                  <Text style={styles.statsDetailValue}>
                    {strava.lifetimeElevationM >= 1000
                      ? `${(strava.lifetimeElevationM / 1000).toFixed(1)}k`
                      : Math.round(strava.lifetimeElevationM).toLocaleString('pt-BR')}m
                  </Text>
                  <Text style={styles.statsDetailLabel}>elevação</Text>
                </View>
              </View>

              {/* Monthly mini chart */}
              {strava.monthlyKm.length > 0 && (
                <View style={styles.monthlyRow}>
                  {strava.monthlyKm.map((item, i, arr) => {
                    const max = Math.max(...arr.map(a => a.km), 1);
                    const h = Math.max((item.km / max) * 40, 4);
                    const isLast = i === arr.length - 1;
                    return (
                      <View key={i} style={styles.monthlyCol}>
                        <View style={styles.monthlyBarWrap}>
                          <LinearGradient
                            colors={isLast ? ['#FF6C24', '#FF8540'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
                            style={[styles.monthlyBar, { height: h }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                          />
                        </View>
                        <Text style={[styles.monthlyLabel, isLast && { color: '#FF8540' }]}>{item.month}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </GlassCard>
          </Animated.View>
        </>
      )}

      {/* ── Quick Actions ── */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.actionsRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/editar-perfil' as any)}>
          <GlassCard style={styles.actionCard}>
            <EditIcon />
            <Text style={styles.actionText}>Editar Perfil</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/social/search' as any)}>
          <GlassCard style={styles.actionCard}>
            <UsersIcon />
            <Text style={styles.actionText}>Encontrar Parceiros</Text>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Logout ── */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)}>
        <TouchableOpacity activeOpacity={0.7} style={styles.logoutBtn} onPress={handleLogout}>
          <LogOutIcon />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </Animated.View>
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 26 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },

  // Profile Card
  profileCard: { padding: 24, marginBottom: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },

  // Avatar with gradient ring
  avatarWrap: { position: 'relative', marginRight: 18 },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    overflow: 'hidden',
  },
  avatarInner: {
    position: 'absolute', top: 3, left: 3,
    width: 78, height: 78, borderRadius: 39,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  avatarImage: { width: 78, height: 78, borderRadius: 39 },
  avatarText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 28, zIndex: 1 },

  // Name & Bio
  nameSection: { flex: 1 },
  userName: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 22 },
  userBio: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, lineHeight: 18 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: 'rgba(255,108,36,0.1)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.2)',
  },
  streakText: { fontFamily: 'Montserrat_600SemiBold', color: '#FFAC7D', fontSize: 12 },

  // Social row
  socialRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 18,
  },
  socialStat: { flex: 1, alignItems: 'center' },
  socialValue: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 18 },
  socialLabel: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  socialDivider: { width: 0.5, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Follow Requests Banner
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,108,36,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  requestsBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,108,36,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsBannerTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    fontSize: 14,
  },
  requestsBannerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },

  // Body stats
  bodyStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  bodyStatSlot: { flex: 1 },
  bodyStatCard: { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center' },
  bodyStatIcon: { marginBottom: 10 },
  streakEmoji: { fontSize: 28, marginBottom: 6 },
  bodyStatLottie: { width: 32, height: 32, marginBottom: 6 },
  bodyStatValue: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 22 },
  bodyStatUnit: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  bodyStatLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  bodyStatUpdated: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 4 },
  streakCard: { overflow: 'hidden' },

  // Connect Strava
  connectCard: { padding: 24, marginBottom: 16 },
  connectTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  stravaLogoBig: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(252,82,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(252,82,0,0.2)',
  },
  connectTitle: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 17 },
  connectDesc: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4, lineHeight: 18 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FC5200', borderRadius: 14, paddingVertical: 14,
    minHeight: 48,
  },
  connectBtnText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 15 },

  // Weekly Activity
  weeklyCard: { padding: 20, marginBottom: 16 },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  weeklyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weeklyTitle: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 16 },
  stravaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(252,82,0,0.08)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(252,82,0,0.2)',
  },
  stravaText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(252,82,0,0.6)', fontSize: 9 },
  stravaName: { fontFamily: 'Montserrat_700Bold', color: '#FC5200', fontSize: 9 },

  weeklyTotalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  weeklyTotalValue: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 32 },
  weeklyTotalUnit: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 18 },
  weeklyGoalText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.25)', fontSize: 13 },

  // Progress bar with runner
  progressWrap: { position: 'relative', marginBottom: 20, paddingTop: 60 },
  runnerWrap: {
    position: 'absolute', top: 0, width: 70, height: 70, zIndex: 5,
  },
  runnerLottie: { width: 70, height: 70 },
  progressBarBg: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressBarFill: { height: 6, borderRadius: 3 },

  // Daily bars
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  barWrap: { height: 64, justifyContent: 'flex-end', marginBottom: 6 },
  bar: { width: 20, borderRadius: 6, minHeight: 4 },
  barLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.25)', fontSize: 10 },
  barLabelActive: { color: '#FF8540' },
  barValue: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 2 },

  // Running Stats
  statsCard: { padding: 20, marginBottom: 16, overflow: 'hidden' },
  statsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  statsTitle: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 16 },
  statsSubtitle: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
  statsHeroRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 18, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statsHeroItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsHeroValue: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 28 },
  statsHeroUnit: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 },
  statsHeroDivider: { width: 0.5, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  statsDetailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 18,
  },
  statsDetail: { alignItems: 'center' },
  statsDetailValue: { fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  statsDetailLabel: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },
  statsDetailDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.12)' },
  monthlyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  monthlyCol: { flex: 1, alignItems: 'center' },
  monthlyBarWrap: { height: 48, justifyContent: 'flex-end', marginBottom: 6 },
  monthlyBar: { width: 18, borderRadius: 5, minHeight: 4 },
  monthlyLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.25)', fontSize: 10 },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  actionText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 8, minHeight: 44,
  },
  logoutText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(239,68,68,0.7)', fontSize: 14 },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  tabBtnActive: { borderColor: 'rgba(255,108,36,0.25)' },
  tabBtnText: { fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  tabBtnTextActive: { color: '#FF8540' },
});

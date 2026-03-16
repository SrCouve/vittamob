import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActionSheetIOS, Platform, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withSequence, withDelay, Easing, runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import { GlassCard } from '../../src/components/GlassCard';
import { FollowButton } from '../../src/components/FollowButton';
import { useAuthStore } from '../../src/stores/authStore';
import { useSocialStore } from '../../src/stores/socialStore';
import {
  type StravaRun, type DistanceCategory, type PersonalRecord,
  computePersonalRecords, getCategoryLabel, getCategoryFullLabel, isCompetitive,
} from '../../src/stores/stravaStore';
import { supabase } from '../../src/lib/supabase';
import { CorridasContent, RecordsContent } from '../(tabs)/corridas';

const isWeb = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

const FIRE_ANIM = require('../../assets/fire-emoji.json');
const SCALE_ANIM = require('../../assets/kitchen-scale.json');
const HEIGHT_ANIM = require('../../assets/height.json');
const RUNNING_ANIM = require('../../assets/running.json');
const CELEBRATION_ANIM = require('../../assets/celebration.json');

// ── Icons ──

function SparkIconSmall() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={1}>
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function BackIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function MenuDotsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="#fff">
      <Circle cx="12" cy="5" r="1.5" />
      <Circle cx="12" cy="12" r="1.5" />
      <Circle cx="12" cy="19" r="1.5" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

function FireIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
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

function SparkIcon({ size = 14, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function ClockIcon({ size = 13, color = 'rgba(255,255,255,0.35)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function RunCardIcon({ size = 18, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="13.5" cy="6.5" r="2.5" />
      <Path d="M10 22 6.5 13 4 15" />
      <Path d="M19.5 9.5 14 14l-3-3" />
      <Path d="m14 14 5.5 8" />
      <Path d="M6.5 13 10 10l3 3" />
    </Svg>
  );
}

// ── Loading Skeleton ──

function ProfileSkeleton() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.skeletonWrap}>
      <GlassCard style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={[styles.skeletonCircle, { width: 84, height: 84, borderRadius: 42 }]} />
          <View style={{ flex: 1, marginLeft: 18 }}>
            <View style={[styles.skeletonLine, { width: '60%', height: 20, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '80%', height: 14 }]} />
          </View>
        </View>
        <View style={[styles.skeletonLine, { width: '100%', height: 44, borderRadius: 22, marginTop: 16 }]} />
        <View style={[styles.socialRow, { marginTop: 20 }]}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.socialStat, { alignItems: 'center' }]}>
              <View style={[styles.skeletonLine, { width: 30, height: 18, marginBottom: 4 }]} />
              <View style={[styles.skeletonLine, { width: 50, height: 11 }]} />
            </View>
          ))}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ── Helpers ──

function formatMemberSince(dateStr?: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function speedToPace(mps: number): string {
  if (mps === 0) return '0:00';
  const paceSeconds = 1000 / mps;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function formatPace(avgSpeed: number): string {
  if (avgSpeed === 0) return '--';
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atras`;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatRecordTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}min`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatRecordPace(paceSecsPerKm: number): string {
  const m = Math.floor(paceSecsPerKm / 60);
  const sec = Math.floor(paceSecsPerKm % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Strava data types ──
interface StravaStats {
  weeklyKm: number[];
  weeklyTotal: number;
  weeklyGoal: number;
  lifetimeDistanceKm: number;
  lifetimeRunCount: number;
  lifetimeMovingTimeHours: number;
  lifetimeElevationM: number;
  avgPace: string;
  monthlyKm: { month: string; km: number }[];
}

// ── Tab type ──
type ProfileTab = 'perfil' | 'corridas' | 'records';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

// ── CategoryIcon for records ──
function CategoryIcon({ category, size = 28 }: { category: DistanceCategory; size?: number }) {
  const num = category === '5k' ? '5' : category === '10k' ? '10' : category === '21k' ? '21' : '42';
  const fs = size * 0.75;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{
        fontFamily: 'Montserrat_800ExtraBold', fontSize: fs,
        color: 'rgba(255,255,255,0.7)', includeFontPadding: false, zIndex: 1,
      }}>{num}</Text>
      <Text style={{
        fontFamily: 'Montserrat_800ExtraBold', fontSize: fs,
        color: '#FF8540', includeFontPadding: false,
        marginLeft: fs * -0.17,
      }}>K</Text>
    </View>
  );
}


// ══════════════════════════════════════
export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const myUserId = session?.user?.id;
  const {
    viewingProfile: profile,
    isLoadingProfile,
    isFollowLoading,
    isMuted,
    fetchPublicProfile,
    fetchMutualFollows,
    mutualFollows,
    mutualFollowsCount,
    followUser,
    unfollowUser,
    cancelRequest,
    acceptRequest,
    declineRequest,
    blockUser,
    muteUser,
    unmuteUser,
    checkMuted,
    clearProfile,
  } = useSocialStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('perfil');

  // Friends count for target user
  const [targetFriendsCount, setTargetFriendsCount] = useState(0);

  // Strava data for this user (fetched independently from stravaStore)
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaStats, setStravaStats] = useState<StravaStats | null>(null);
  const [stravaRuns, setStravaRuns] = useState<StravaRun[]>([]);
  const [isLoadingStrava, setIsLoadingStrava] = useState(false);

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (id && myUserId && id === myUserId) {
      router.replace('/(tabs)/perfil' as any);
    }
  }, [id, myUserId]);

  // Fetch profile on focus
  useFocusEffect(
    useCallback(() => {
      if (id && myUserId && id !== myUserId) {
        setHasFetched(false);
        fetchPublicProfile(myUserId, id).then(() => setHasFetched(true));
        fetchMutualFollows(myUserId, id);
        checkMuted(myUserId, id);
      }
      // Fetch friends count (only if we have a valid id)
      if (id) {
        supabase.rpc('count_friends', { p_user_id: id }).then(({ data }) => {
          if (typeof data === 'number') setTargetFriendsCount(data);
        });
      }

      return () => {
        // DON'T clearProfile here — it causes "not found" flash during navigation transitions
        // Profile gets overwritten naturally when visiting a new profile
        if (sparkCleanupTimer.current) clearTimeout(sparkCleanupTimer.current);
        if (followDelayTimer.current) clearTimeout(followDelayTimer.current);
      };
    }, [id, myUserId])
  );

  // Fetch Strava data when profile loads and is not limited
  useEffect(() => {
    if (!profile || profile.limited || !myUserId || !id) return;
    if (!profile.has_strava) return;

    setIsLoadingStrava(true);
    supabase.rpc('get_user_strava_data', {
      p_viewer_id: myUserId,
      p_target_id: id,
    }).then(({ data, error }) => {
      if (error) {
        // RPC might not be deployed yet — fallback to direct queries
        if (error.code === '42883') {
          console.warn('get_user_strava_data RPC not deployed yet, falling back');
          fetchStravaFallback();
        } else {
          console.error('get_user_strava_data error:', error);
        }
        setIsLoadingStrava(false);
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result || !result.connected) {
        setStravaConnected(false);
        setIsLoadingStrava(false);
        return;
      }

      setStravaConnected(true);

      if (result.stats) {
        const s = result.stats;
        setStravaStats({
          weeklyKm: (s.weekly_km as number[]) || [0, 0, 0, 0, 0, 0, 0],
          weeklyTotal: s.weekly_total_km || 0,
          weeklyGoal: s.weekly_goal_km || 20,
          lifetimeDistanceKm: (s.lifetime_distance_m || 0) / 1000,
          lifetimeRunCount: s.lifetime_run_count || 0,
          lifetimeMovingTimeHours: Math.round((s.lifetime_moving_time_s || 0) / 3600),
          lifetimeElevationM: s.lifetime_elevation_m || 0,
          avgPace: s.avg_pace_mps ? speedToPace(s.avg_pace_mps) : '0:00',
          monthlyKm: (s.monthly_km as { month: string; km: number }[]) || [],
        });
      }

      if (result.runs) {
        const runs: StravaRun[] = (result.runs || []).map((r: any) => ({
          id: r.id,
          strava_activity_id: r.strava_activity_id,
          activity_name: r.activity_name ?? 'Corrida',
          activity_date: r.activity_date,
          distance_km: Number(r.distance_km),
          moving_time_seconds: r.moving_time_seconds ?? 0,
          average_speed: Number(r.average_speed) || 0,
          sparks_awarded: r.sparks_awarded ?? 0,
          workout_type: r.workout_type ?? null,
        }));
        setStravaRuns(runs);
      }

      setIsLoadingStrava(false);
    });
  }, [profile?.id, profile?.limited, profile?.has_strava, myUserId, id]);

  // Fallback: direct table queries if RPC not deployed
  const fetchStravaFallback = async () => {
    if (!id) return;

    // Check connection
    const { data: conn } = await supabase
      .from('strava_connections')
      .select('user_id')
      .eq('user_id', id)
      .single();

    if (!conn) {
      setStravaConnected(false);
      return;
    }

    setStravaConnected(true);

    // Fetch stats cache
    const { data: stats } = await supabase
      .from('strava_stats_cache')
      .select('*')
      .eq('user_id', id)
      .single();

    if (stats) {
      setStravaStats({
        weeklyKm: (stats.weekly_km as number[]) || [0, 0, 0, 0, 0, 0, 0],
        weeklyTotal: stats.weekly_total_km || 0,
        weeklyGoal: stats.weekly_goal_km || 20,
        lifetimeDistanceKm: (stats.lifetime_distance_m || 0) / 1000,
        lifetimeRunCount: stats.lifetime_run_count || 0,
        lifetimeMovingTimeHours: Math.round((stats.lifetime_moving_time_s || 0) / 3600),
        lifetimeElevationM: stats.lifetime_elevation_m || 0,
        avgPace: stats.avg_pace_mps ? speedToPace(stats.avg_pace_mps) : '0:00',
        monthlyKm: (stats.monthly_km as { month: string; km: number }[]) || [],
      });
    }

    // Fetch runs
    const { data: runsData } = await supabase
      .from('strava_awarded_runs')
      .select('*')
      .eq('user_id', id)
      .order('activity_date', { ascending: false })
      .limit(100);

    if (runsData) {
      const runs: StravaRun[] = runsData.map((r: any) => ({
        id: r.id,
        strava_activity_id: r.strava_activity_id,
        activity_name: r.activity_name ?? 'Corrida',
        activity_date: r.activity_date,
        distance_km: Number(r.distance_km),
        moving_time_seconds: r.moving_time_seconds ?? 0,
        average_speed: Number(r.average_speed) || 0,
        sparks_awarded: r.sparks_awarded ?? 0,
        workout_type: r.workout_type ?? null,
      }));
      setStravaRuns(runs);
    }
  };

  const displayName = profile?.name ?? 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const isFollowBusy = id ? (isFollowLoading[id] ?? false) : false;

  // Mutual follows text
  const getMutualText = useMemo(() => {
    if (mutualFollowsCount === 0) return '';
    const names = mutualFollows.map((u) => u.name.split(' ')[0]);
    if (mutualFollowsCount === 1) return `Apoiado por ${names[0]}`;
    if (mutualFollowsCount === 2) return `Apoiado por ${names[0]} e ${names[1]}`;
    if (mutualFollowsCount === 3) return `Apoiado por ${names[0]}, ${names[1]} e ${names[2]}`;
    return `Apoiado por ${names[0]}, ${names[1]} e mais ${mutualFollowsCount - 2}`;
  }, [mutualFollows, mutualFollowsCount]);

  // ── Follow / Unfollow handlers ──
  const handleFollow = useCallback(async () => {
    if (!myUserId || !id) return;
    const result = await followUser(myUserId, id);
    if (result === 'requested') {
      Alert.alert('Solicitacao enviada', 'O usuario sera notificado do seu pedido.');
    } else if (result === 'mutual') {
      Alert.alert('Parceiros!', 'Agora voces sao parceiros!');
      fetchPublicProfile(myUserId, id);
    }
  }, [myUserId, id]);

  const handleUnfollow = useCallback(() => {
    if (!myUserId || !id) return;
    Alert.alert(
      'Deixar de apoiar',
      `Tem certeza que deseja deixar de apoiar ${displayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deixar de apoiar',
          style: 'destructive',
          onPress: () => unfollowUser(myUserId, id),
        },
      ]
    );
  }, [myUserId, id, displayName]);

  const handleCancelRequest = useCallback(() => {
    if (!myUserId || !id) return;
    cancelRequest(myUserId, id);
  }, [myUserId, id]);

  const handleAcceptRequest = useCallback(async () => {
    if (!myUserId || !id) return;
    const isMutual = await acceptRequest(myUserId, id);
    if (isMutual) Alert.alert('Parceiros!', 'Agora voces sao parceiros!');
    fetchPublicProfile(myUserId, id);
  }, [myUserId, id]);

  const handleDeclineRequest = useCallback(() => {
    if (!myUserId || !id) return;
    declineRequest(myUserId, id);
    fetchPublicProfile(myUserId, id);
  }, [myUserId, id]);

  // ── Mute toggle ──
  const handleToggleMute = useCallback(async () => {
    if (!myUserId || !id) return;
    if (isMuted) {
      await unmuteUser(myUserId, id);
      Alert.alert('Deixou de silenciar');
    } else {
      await muteUser(myUserId, id);
      Alert.alert('Silenciado');
    }
  }, [myUserId, id, isMuted]);

  // ── Menu ──
  const handleMenu = useCallback(() => {
    if (!myUserId || !id) return;
    const muteLabel = isMuted ? 'Deixar de silenciar' : 'Silenciar';
    const options = [muteLabel, `Bloquear @${displayName}`, 'Denunciar', 'Cancelar'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: 1, cancelButtonIndex: 3 },
        (index) => {
          if (index === 0) handleToggleMute();
          if (index === 1) handleBlock();
          if (index === 2) handleReport();
        }
      );
    } else {
      Alert.alert('Opcoes', undefined, [
        { text: muteLabel, onPress: handleToggleMute },
        { text: `Bloquear @${displayName}`, style: 'destructive', onPress: handleBlock },
        { text: 'Denunciar', onPress: handleReport },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  }, [myUserId, id, displayName, isMuted]);

  const handleBlock = useCallback(() => {
    if (!myUserId || !id) return;
    Alert.alert(
      'Bloquear usuario',
      `${displayName} nao podera ver seu perfil ou interagir com voce.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            await blockUser(myUserId, id);
            router.back();
          },
        },
      ]
    );
  }, [myUserId, id, displayName]);

  const handleReport = useCallback(() => {
    Alert.alert('Denuncia enviada', 'Obrigado por reportar. Vamos analisar o conteudo.', [{ text: 'OK' }]);
  }, []);

  // Body stats from profile
  const weight = profile?.weight_kg ?? null;
  const height = profile?.height_cm ?? null;
  const streakDays = profile?.streak_days ?? 0;

  // Lottie refs
  const heightRef = useRef<LottieView>(null);
  const heightPlays = useRef(0);
  const scaleRef = useRef<LottieView>(null);
  const scalePlays = useRef(0);

  useEffect(() => {
    if (profile && !profile.limited) {
      const t1 = setTimeout(() => heightRef.current?.play(), 300);
      const t2 = setTimeout(() => scaleRef.current?.play(), 300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [profile?.id, profile?.limited]);

  const onHeightAnimFinish = (isCancelled: boolean) => {
    if (isCancelled) return;
    heightPlays.current += 1;
    if (heightPlays.current < 2) heightRef.current?.play();
  };
  const onScaleAnimFinish = (isCancelled: boolean) => {
    if (isCancelled) return;
    scalePlays.current += 1;
    if (scalePlays.current < 2) scaleRef.current?.play();
  };

  // Strava derived values
  const weeklyKm = stravaStats?.weeklyKm ?? [0, 0, 0, 0, 0, 0, 0];
  const weeklyTotal = stravaStats?.weeklyTotal ?? 0;
  const weeklyGoal = stravaStats?.weeklyGoal ?? 20;
  const weeklyProgress = weeklyGoal > 0 ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0;
  const maxBar = Math.max(...weeklyKm, 1);

  // ── Spark Transfer Animation ──
  const sparkCleanupTimer = useRef<NodeJS.Timeout | null>(null);
  const followDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const [sparkFlying, setSparkFlying] = useState(false);
  const sparkY = useSharedValue(0);
  const sparkX = useSharedValue(0);
  const sparkScale = useSharedValue(0);
  const sparkOpacity = useSharedValue(0);
  const sparkRotation = useSharedValue(0);
  const avatarGlow = useSharedValue(0);
  const avatarPulse = useSharedValue(1);
  const kmBadgeOpacity = useSharedValue(0);
  const kmBadgeY = useSharedValue(0);
  const screenFlash = useSharedValue(0);

  // Trail sparks (3 smaller ones that follow)
  const trail1Y = useSharedValue(0);
  const trail1Opacity = useSharedValue(0);
  const trail2Y = useSharedValue(0);
  const trail2Opacity = useSharedValue(0);
  const trail3Y = useSharedValue(0);
  const trail3Opacity = useSharedValue(0);

  const triggerTransferAnimation = useCallback(() => {
    setSparkFlying(true);

    // Start position: near the button (bottom of card ~280px down)
    // End position: avatar (top of card ~42px down)
    const startY = 240;
    const endY = 0;

    // Reset
    sparkY.value = startY;
    sparkX.value = 0;
    sparkScale.value = 0;
    sparkOpacity.value = 0;
    sparkRotation.value = -15;
    avatarGlow.value = 0;
    avatarPulse.value = 1;
    kmBadgeOpacity.value = 0;
    kmBadgeY.value = 0;
    screenFlash.value = 0;
    trail1Y.value = startY + 20;
    trail1Opacity.value = 0;
    trail2Y.value = startY + 40;
    trail2Opacity.value = 0;
    trail3Y.value = startY + 60;
    trail3Opacity.value = 0;

    // Phase 1: Spark appears at button with a POP
    sparkOpacity.value = withTiming(1, { duration: 100 });
    sparkScale.value = withSequence(
      withTiming(1.8, { duration: 120, easing: Easing.out(Easing.back(2)) }),
      withTiming(1.2, { duration: 100 }),
    );

    // Phase 2: Spark flies UP to avatar with a curve
    sparkY.value = withDelay(200, withTiming(endY, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }));
    sparkX.value = withDelay(200, withSequence(
      withTiming(15, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
    ));
    sparkRotation.value = withDelay(200, withTiming(15, { duration: 400 }));
    sparkScale.value = withDelay(200, withSequence(
      withTiming(0.8, { duration: 200 }),
      withTiming(1.5, { duration: 200 }),
    ));

    // Trail sparks follow with delay
    trail1Opacity.value = withDelay(250, withSequence(
      withTiming(0.7, { duration: 80 }),
      withDelay(250, withTiming(0, { duration: 100 })),
    ));
    trail1Y.value = withDelay(250, withTiming(endY + 30, { duration: 350, easing: Easing.bezier(0.4, 0, 0.2, 1) }));

    trail2Opacity.value = withDelay(300, withSequence(
      withTiming(0.5, { duration: 80 }),
      withDelay(200, withTiming(0, { duration: 100 })),
    ));
    trail2Y.value = withDelay(300, withTiming(endY + 50, { duration: 350, easing: Easing.bezier(0.4, 0, 0.2, 1) }));

    trail3Opacity.value = withDelay(350, withSequence(
      withTiming(0.3, { duration: 80 }),
      withDelay(150, withTiming(0, { duration: 100 })),
    ));
    trail3Y.value = withDelay(350, withTiming(endY + 70, { duration: 350, easing: Easing.bezier(0.4, 0, 0.2, 1) }));

    // Phase 3: Spark arrives → avatar GLOWS + PULSES
    sparkOpacity.value = withDelay(580, withTiming(0, { duration: 100 }));

    // Triple shockwave with tremor — premium energy discharge

    // Wave 1 — main impact, bright, fast
    wave1Scale.value = 1;
    wave1Rotate.value = 0;
    wave1Skew.value = 0;
    wave1Scale.value = withDelay(580, withTiming(16, { duration: 900, easing: Easing.out(Easing.cubic) }));
    wave1Opacity.value = withDelay(580, withSequence(
      withTiming(0.9, { duration: 30 }),
      withTiming(0, { duration: 870, easing: Easing.out(Easing.quad) }),
    ));
    // Tremor: wobble rotation + organic skew
    wave1Rotate.value = withDelay(580, withSequence(
      withTiming(8, { duration: 100 }),
      withTiming(-5, { duration: 120 }),
      withTiming(3, { duration: 140 }),
      withTiming(-2, { duration: 160 }),
      withTiming(0, { duration: 380 }),
    ));
    wave1Skew.value = withDelay(580, withSequence(
      withTiming(0.08, { duration: 110 }),
      withTiming(-0.05, { duration: 130 }),
      withTiming(0.03, { duration: 150 }),
      withTiming(0, { duration: 500 }),
    ));

    // Wave 2 — secondary, peach tones
    wave2Scale.value = 1;
    wave2Rotate.value = 0;
    wave2Skew.value = 0;
    wave2Scale.value = withDelay(680, withTiming(14, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    wave2Opacity.value = withDelay(680, withSequence(
      withTiming(0.6, { duration: 30 }),
      withTiming(0, { duration: 970, easing: Easing.out(Easing.quad) }),
    ));
    wave2Rotate.value = withDelay(680, withSequence(
      withTiming(-6, { duration: 120 }),
      withTiming(4, { duration: 140 }),
      withTiming(-2, { duration: 160 }),
      withTiming(0, { duration: 580 }),
    ));
    wave2Skew.value = withDelay(680, withSequence(
      withTiming(-0.06, { duration: 130 }),
      withTiming(0.04, { duration: 150 }),
      withTiming(0, { duration: 720 }),
    ));

    // Wave 3 — aftershock, subtle warmth
    wave3Scale.value = 1;
    wave3Rotate.value = 0;
    wave3Skew.value = 0;
    wave3Scale.value = withDelay(820, withTiming(12, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    wave3Opacity.value = withDelay(820, withSequence(
      withTiming(0.35, { duration: 30 }),
      withTiming(0, { duration: 1070, easing: Easing.out(Easing.quad) }),
    ));
    wave3Rotate.value = withDelay(820, withSequence(
      withTiming(4, { duration: 150 }),
      withTiming(-3, { duration: 170 }),
      withTiming(0, { duration: 780 }),
    ));
    wave3Skew.value = withDelay(820, withSequence(
      withTiming(0.04, { duration: 160 }),
      withTiming(-0.02, { duration: 180 }),
      withTiming(0, { duration: 760 }),
    ));
    avatarPulse.value = withDelay(580, withSequence(
      withSpring(1.12, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    ));

    // Screen flash
    screenFlash.value = withDelay(580, withSequence(
      withTiming(0.15, { duration: 60 }),
      withTiming(0, { duration: 300 }),
    ));

    // "+1km" badge — fades in, stays visible long, drifts up, fades out very slowly
    kmBadgeOpacity.value = withDelay(700, withSequence(
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
      withDelay(2000, withTiming(0, { duration: 1000, easing: Easing.out(Easing.quad) })),
    ));
    kmBadgeY.value = withDelay(700, withTiming(-55, { duration: 3500, easing: Easing.out(Easing.quad) }));

    // Cleanup
    sparkCleanupTimer.current = setTimeout(() => setSparkFlying(false), 2200);
  }, []);

  const sparkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: sparkY.value },
      { translateX: sparkX.value },
      { scale: sparkScale.value },
      { rotate: `${sparkRotation.value}deg` },
    ],
    opacity: sparkOpacity.value,
  }));

  const trail1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: trail1Y.value }, { scale: 0.5 }],
    opacity: trail1Opacity.value,
  }));
  const trail2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: trail2Y.value }, { scale: 0.35 }],
    opacity: trail2Opacity.value,
  }));
  const trail3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: trail3Y.value }, { scale: 0.25 }],
    opacity: trail3Opacity.value,
  }));

  // 3 concentric shockwave rings with tremor
  const wave1Scale = useSharedValue(1);
  const wave1Opacity = useSharedValue(0);
  const wave1Rotate = useSharedValue(0);
  const wave1Skew = useSharedValue(0);
  const wave2Scale = useSharedValue(1);
  const wave2Opacity = useSharedValue(0);
  const wave2Rotate = useSharedValue(0);
  const wave2Skew = useSharedValue(0);
  const wave3Scale = useSharedValue(1);
  const wave3Opacity = useSharedValue(0);
  const wave3Rotate = useSharedValue(0);
  const wave3Skew = useSharedValue(0);

  const wave1Style = useAnimatedStyle(() => ({
    opacity: wave1Opacity.value,
    transform: [
      { scale: wave1Scale.value },
      { rotate: `${wave1Rotate.value}deg` },
      { scaleX: 1 + wave1Skew.value },
    ],
  }));
  const wave2Style = useAnimatedStyle(() => ({
    opacity: wave2Opacity.value,
    transform: [
      { scale: wave2Scale.value },
      { rotate: `${wave2Rotate.value}deg` },
      { scaleX: 1 + wave2Skew.value },
    ],
  }));
  const wave3Style = useAnimatedStyle(() => ({
    opacity: wave3Opacity.value,
    transform: [
      { scale: wave3Scale.value },
      { rotate: `${wave3Rotate.value}deg` },
      { scaleX: 1 + wave3Skew.value },
    ],
  }));

  const avatarPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPulse.value }],
  }));

  const kmBadgeStyle = useAnimatedStyle(() => ({
    opacity: kmBadgeOpacity.value,
    transform: [{ translateY: kmBadgeY.value }],
  }));

  const screenFlashStyle = useAnimatedStyle(() => ({
    opacity: screenFlash.value,
  }));

  // Override handleFollow to include transfer animation
  const handleFollowWithAnimation = useCallback(async () => {
    if (!myUserId || !id) return;
    triggerTransferAnimation();
    // Delay the actual follow call so animation is visible
    followDelayTimer.current = setTimeout(async () => {
      const result = await followUser(myUserId, id);
      if (result === 'requested') {
        Alert.alert('Solicitacao de apoio enviada', 'O usuario sera notificado.');
      } else if (result === 'mutual') {
        Alert.alert('Parceiros!', 'Agora voces sao parceiros!');
      }
    }, 600);
  }, [myUserId, id, triggerTransferAnimation]);

  // ── Not found state ──
  // Only show "not found" after we've actually tried to load (not on initial render)
  const [hasFetched, setHasFetched] = useState(false);
  const showNotFound = hasFetched && !isLoadingProfile && !profile && id !== myUserId;

  // Force loading state on mount to prevent any flash
  useEffect(() => {
    useSocialStore.setState({ isLoadingProfile: true, viewingProfile: null });
  }, [id]);

  return (
    <View style={styles.root}>
      {/* Screen flash overlay */}
      <Animated.View
        style={[styles.screenFlashOverlay, screenFlashStyle]}
        pointerEvents="none"
      />
      {/* ── Header Bar ── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackIcon />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {isLoadingProfile ? '' : displayName}
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          onPress={handleMenu}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MenuDotsIcon />
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {(isLoadingProfile || !hasFetched || !profile) ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* ── Profile Card ── */}
            <Animated.View entering={FadeInDown.delay(50).duration(500)}>
              <GlassCard variant="medium" style={{ ...styles.profileCard, overflow: 'hidden' as const }}>
                {/* Triple shockwave rings from avatar — gradient + tremor */}
                <Animated.View style={[styles.waveRing, wave1Style]} pointerEvents="none">
                  <LinearGradient
                    colors={['rgba(255,108,36,0.5)', 'rgba(255,133,64,0.2)', 'rgba(255,172,125,0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                </Animated.View>
                <Animated.View style={[styles.waveRing, styles.waveRing2, wave2Style]} pointerEvents="none">
                  <LinearGradient
                    colors={['rgba(255,133,64,0.35)', 'rgba(255,172,125,0.1)', 'rgba(255,200,160,0.02)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                </Animated.View>
                <Animated.View style={[styles.waveRing, styles.waveRing3, wave3Style]} pointerEvents="none">
                  <LinearGradient
                    colors={['rgba(255,172,125,0.2)', 'rgba(255,200,160,0.05)', 'transparent']}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                </Animated.View>

                <View style={styles.profileTop}>
                  <View style={styles.avatarWrap}>

                    {/* "+1km" floating badge */}
                    <Animated.View style={[styles.kmBadge, kmBadgeStyle]} pointerEvents="none">
                      <LinearGradient
                        colors={['#FF6C24', '#FF8540']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.kmBadgeInner}
                      >
                        <SparkIconSmall />
                        <Text style={styles.kmBadgeText}>1km</Text>
                      </LinearGradient>
                    </Animated.View>

                    {/* Avatar always visible */}
                    <View style={styles.avatarRing}>
                      <LinearGradient
                        colors={['#FF6C24', '#FF8540', '#FFAC7D']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    </View>
                    <View style={styles.avatarInner}>
                      {profile.avatar_url ? (
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
                    {profile.bio ? (
                      <Text style={styles.userBio} numberOfLines={3}>{profile.bio}</Text>
                    ) : null}

                    {/* Streak badge */}
                    {!profile.limited && streakDays > 0 && (
                      <View style={styles.streakBadge}>
                        <FireIcon size={14} />
                        <Text style={styles.streakText}>{streakDays} dias de streak</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* They requested to follow me */}
                {profile.relationship.they_requested && (
                  <View style={styles.requestBanner}>
                    <Text style={styles.requestBannerText}>
                      {displayName} quer te apoiar
                    </Text>
                    <View style={styles.requestBannerActions}>
                      <TouchableOpacity
                        style={styles.requestAcceptBtn}
                        activeOpacity={0.8}
                        onPress={handleAcceptRequest}
                      >
                        <LinearGradient
                          colors={['#FF6C24', '#FF8540']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.requestAcceptText}>Aceitar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.requestDeclineBtn}
                        activeOpacity={0.8}
                        onPress={handleDeclineRequest}
                      >
                        <Text style={styles.requestDeclineText}>Recusar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Flying Spark (absolute within profile card) */}
                {sparkFlying && (
                  <View style={styles.sparkContainer} pointerEvents="none">
                    {/* Main spark bolt */}
                    <Animated.View style={[styles.flyingSpark, sparkStyle]}>
                      <Svg width={28} height={28} viewBox="0 0 24 24" fill="#FF6C24" stroke="#FF8540" strokeWidth={1}>
                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </Svg>
                    </Animated.View>
                    {/* Trail sparks */}
                    <Animated.View style={[styles.flyingSpark, trail1Style]}>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="#FF8540">
                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </Svg>
                    </Animated.View>
                    <Animated.View style={[styles.flyingSpark, trail2Style]}>
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="#FFAC7D">
                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </Svg>
                    </Animated.View>
                    <Animated.View style={[styles.flyingSpark, trail3Style]}>
                      <Svg width={8} height={8} viewBox="0 0 24 24" fill="#FFAC7D">
                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </Svg>
                    </Animated.View>
                  </View>
                )}

                {/* Follow Button */}
                <View style={styles.followBtnWrap}>
                  <FollowButton
                    relationship={profile.relationship}
                    isLoading={isFollowBusy}
                    onFollow={handleFollowWithAnimation}
                    onUnfollow={handleUnfollow}
                    onCancelRequest={handleCancelRequest}
                  />
                </View>

                {/* Social stats row */}
                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialStat} activeOpacity={0.7}
                    onPress={() => router.push(`/social/followers?userId=${id}&userName=${encodeURIComponent(profile.name || '')}` as any)}
                  >
                    <Text style={styles.socialValue}>{profile.followers_count}</Text>
                    <Text style={styles.socialLabel}>Apoiadores</Text>
                  </TouchableOpacity>
                  <View style={styles.socialDivider} />
                  <TouchableOpacity style={styles.socialStat} activeOpacity={0.7}
                    onPress={() => router.push(`/social/following?userId=${id}&userName=${encodeURIComponent(profile.name || '')}` as any)}
                  >
                    <Text style={styles.socialValue}>{profile.following_count}</Text>
                    <Text style={styles.socialLabel}>Apoiando</Text>
                  </TouchableOpacity>
                  <View style={styles.socialDivider} />
                  <TouchableOpacity style={styles.socialStat} activeOpacity={0.7}
                    onPress={() => router.push(`/social/friends?userId=${id}&userName=${encodeURIComponent(profile.name || '')}` as any)}
                  >
                    <Text style={styles.socialValue}>
                      {targetFriendsCount}
                    </Text>
                    <Text style={styles.socialLabel}>Parceiros</Text>
                  </TouchableOpacity>
                </View>

                {/* Mutual follows indicator */}
                {mutualFollowsCount > 0 && id !== myUserId && (
                  <TouchableOpacity activeOpacity={0.7} style={styles.mutualRow}>
                    <View style={styles.mutualAvatars}>
                      {mutualFollows.slice(0, 3).map((user, idx) => (
                        <View
                          key={user.id}
                          style={[
                            styles.mutualAvatarWrap,
                            idx > 0 && { marginLeft: -6 },
                            { zIndex: 3 - idx },
                          ]}
                        >
                          {user.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.mutualAvatarImg} />
                          ) : (
                            <LinearGradient
                              colors={['#FF6C24', '#FFAC7D']}
                              style={styles.mutualAvatarFallback}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={styles.mutualAvatarInitial}>
                                {user.name.charAt(0).toUpperCase()}
                              </Text>
                            </LinearGradient>
                          )}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.mutualText}>
                      {getMutualText.split(/(Apoiado por )/).map((part, i) => {
                        if (part === 'Apoiado por ') return <Text key={i}>{part}</Text>;
                        return part.split(/(, | e | e mais \d+)/).map((seg, j) => {
                          if (/^(, | e | e mais \d+)$/.test(seg)) return <Text key={`${i}-${j}`}>{seg}</Text>;
                          return <Text key={`${i}-${j}`} style={styles.mutualNameBold}>{seg}</Text>;
                        });
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </GlassCard>
            </Animated.View>

            {/* ── Private Profile Gate ── */}
            {profile.limited ? (
              <Animated.View entering={FadeInDown.delay(120).duration(500)}>
                <GlassCard variant="light" style={styles.privateCard}>
                  <LockIcon />
                  <Text style={styles.privateTitle}>Este perfil e privado</Text>
                  <Text style={styles.privateSubtitle}>
                    {profile.relationship.i_requested
                      ? 'Solicitacao de apoio enviada. Aguardando aprovacao.'
                      : 'Apoie este usuario para ver suas publicacoes'}
                  </Text>
                </GlassCard>
              </Animated.View>
            ) : (
              <>
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
                  <CorridasContent userId={id ?? null} readOnly />
                ) : activeTab === 'records' ? (
                  <RecordsContent userId={id ?? null} readOnly />
                ) : (
                  <>
                    {/* ── Body Stats ── */}
                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.bodyStatsRow}>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => scaleRef.current?.play()} style={styles.bodyStatSlot}>
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
                            {weight != null ? weight : '--'}<Text style={styles.bodyStatUnit}> kg</Text>
                          </Text>
                          <Text style={styles.bodyStatLabel}>Peso</Text>
                        </GlassCard>
                      </TouchableOpacity>

                      <TouchableOpacity activeOpacity={0.7} onPress={() => heightRef.current?.play()} style={styles.bodyStatSlot}>
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
                            {height != null ? height : '--'}<Text style={styles.bodyStatUnit}> cm</Text>
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

                    {/* ── Strava Section (only if connected) ── */}
                    {stravaConnected && stravaStats && (
                      <>
                        {/* Weekly Activity */}
                        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                          <GlassCard style={styles.weeklyCard}>
                            <View style={styles.weeklyHeader}>
                              <View style={styles.weeklyTitleRow}>
                                <RunIcon />
                                <Text style={styles.weeklyTitle}>Meta Semanal</Text>
                              </View>
                              <View style={styles.stravaBadge}>
                                <Svg width={12} height={12} viewBox="0 0 16 16" fill="#FC5200">
                                  <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                                </Svg>
                                <Text style={styles.stravaText}>powered by </Text>
                                <Text style={styles.stravaName}>Strava</Text>
                              </View>
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

                        {/* Running Stats — Sua Jornada */}
                        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                          <GlassCard style={styles.statsCard}>
                            <View style={styles.statsTitleRow}>
                              <RunIcon />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.statsTitle}>Jornada</Text>
                                <Text style={styles.statsSubtitle}>historico lifetime</Text>
                              </View>
                              <View style={styles.stravaBadge}>
                                <Svg width={12} height={12} viewBox="0 0 16 16" fill="#FC5200">
                                  <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
                                </Svg>
                                <Text style={styles.stravaText}>powered by </Text>
                                <Text style={styles.stravaName}>Strava</Text>
                              </View>
                            </View>

                            {/* Hero row */}
                            <View style={styles.statsHeroRow}>
                              <View style={styles.statsHeroItem}>
                                <Text style={styles.statsHeroValue}>
                                  {stravaStats.lifetimeDistanceKm >= 1000
                                    ? `${(stravaStats.lifetimeDistanceKm / 1000).toFixed(1)}k`
                                    : Math.round(stravaStats.lifetimeDistanceKm).toLocaleString('pt-BR')}
                                </Text>
                                <Text style={styles.statsHeroUnit}>km total</Text>
                              </View>
                              <View style={styles.statsHeroDivider} />
                              <View style={styles.statsHeroItem}>
                                <Text style={styles.statsHeroValue}>{stravaStats.avgPace}</Text>
                                <Text style={styles.statsHeroUnit}>pace medio</Text>
                              </View>
                            </View>

                            {/* Detail row */}
                            <View style={styles.statsDetailRow}>
                              <View style={styles.statsDetail}>
                                <Text style={styles.statsDetailValue}>{stravaStats.lifetimeRunCount}</Text>
                                <Text style={styles.statsDetailLabel}>corridas</Text>
                              </View>
                              <View style={styles.statsDetailDot} />
                              <View style={styles.statsDetail}>
                                <Text style={styles.statsDetailValue}>{stravaStats.lifetimeMovingTimeHours}h</Text>
                                <Text style={styles.statsDetailLabel}>tempo</Text>
                              </View>
                              <View style={styles.statsDetailDot} />
                              <View style={styles.statsDetail}>
                                <Text style={styles.statsDetailValue}>
                                  {stravaStats.lifetimeElevationM >= 1000
                                    ? `${(stravaStats.lifetimeElevationM / 1000).toFixed(1)}k`
                                    : Math.round(stravaStats.lifetimeElevationM).toLocaleString('pt-BR')}m
                                </Text>
                                <Text style={styles.statsDetailLabel}>elevacao</Text>
                              </View>
                            </View>

                            {/* Monthly mini chart */}
                            {stravaStats.monthlyKm.length > 0 && (
                              <View style={styles.monthlyRow}>
                                {stravaStats.monthlyKm.map((item, i, arr) => {
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
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header Bar
  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold', color: '#fff',
    fontSize: 17, marginHorizontal: 8,
  },

  // Profile Card
  profileCard: { padding: 24, marginBottom: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

  // Avatar
  avatarWrap: { position: 'relative', marginRight: 18 },
  avatarRing: { width: 84, height: 84, borderRadius: 42, overflow: 'hidden' },
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
  userBio: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.45)',
    fontSize: 13, marginTop: 4, lineHeight: 18,
  },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: 'rgba(255,108,36,0.1)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.2)',
  },
  streakText: { fontFamily: 'Montserrat_600SemiBold', color: '#FFAC7D', fontSize: 12 },

  // Follow Button
  followBtnWrap: { marginBottom: 20 },

  // They-requested banner
  requestBanner: {
    backgroundColor: 'rgba(255,108,36,0.08)', borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.20)', borderRadius: 16,
    padding: 14, marginBottom: 14, alignItems: 'center',
  },
  requestBannerText: {
    fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.8)',
    fontSize: 13, marginBottom: 10, textAlign: 'center',
  },
  requestBannerActions: { flexDirection: 'row', gap: 10 },
  requestAcceptBtn: {
    height: 34, paddingHorizontal: 20, borderRadius: 17,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  requestAcceptText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 13 },
  requestDeclineBtn: {
    height: 34, paddingHorizontal: 20, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  requestDeclineText: { fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.6)', fontSize: 13 },

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

  // Mutual follows
  mutualRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 12,
  },
  mutualAvatars: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  mutualAvatarWrap: {
    width: 20, height: 20, borderRadius: 10,
    overflow: 'hidden', borderWidth: 1.5, borderColor: '#0D0D0D',
  },
  mutualAvatarImg: { width: '100%', height: '100%', borderRadius: 10 },
  mutualAvatarFallback: {
    width: '100%', height: '100%', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  mutualAvatarInitial: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 8 },
  mutualText: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.50)',
    fontSize: 12, flex: 1, lineHeight: 16,
  },
  mutualNameBold: { fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.70)' },

  // Private profile
  privateCard: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  privateTitle: {
    fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.60)',
    fontSize: 16, marginTop: 16, textAlign: 'center',
  },
  privateSubtitle: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)',
    fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 18,
  },

  // Not found
  notFoundCard: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  notFoundTitle: {
    fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.60)',
    fontSize: 16, marginTop: 16, textAlign: 'center',
  },
  notFoundSubtitle: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)',
    fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 18,
  },
  notFoundBtn: {
    marginTop: 24, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  notFoundBtnText: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 14 },

  // Skeleton
  skeletonWrap: { opacity: 0.6 },
  skeletonCircle: { backgroundColor: 'rgba(255,255,255,0.06)' },
  skeletonLine: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6 },

  // Tab Switcher
  tabSwitcher: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  tabBtnActive: { borderColor: 'rgba(255,108,36,0.25)' },
  tabBtnText: { fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  tabBtnTextActive: { color: '#FF8540' },

  // Body stats
  bodyStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  bodyStatSlot: { flex: 1 },
  bodyStatCard: { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center' },
  bodyStatLottie: { width: 32, height: 32, marginBottom: 6 },
  bodyStatValue: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 22 },
  bodyStatUnit: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  bodyStatLabel: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },

  // Weekly Activity (Strava)
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

  // Progress bar
  progressWrap: { position: 'relative', marginBottom: 20, paddingTop: 60 },
  runnerWrap: { position: 'absolute', top: 0, width: 70, height: 70, zIndex: 5 },
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

  // ── Spark Transfer Animation ──
  screenFlashOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FF6C24',
    zIndex: 100,
    pointerEvents: 'none',
  },
  // Shockwave rings — all start at avatar center, gradient filled
  waveRing: {
    position: 'absolute',
    top: 46, // padding(24) + half avatar(42) - half ring(20)
    left: 46,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 0,
    borderWidth: 2.5,
    borderColor: 'rgba(255,108,36,0.4)',
  },
  waveRing2: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,133,64,0.25)',
  },
  waveRing3: {
    borderWidth: 1,
    borderColor: 'rgba(255,172,125,0.15)',
  },
  kmBadge: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  kmBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#FF6C24',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  kmBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    fontSize: 12,
  },
  sparkContainer: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
    pointerEvents: 'none',
  },
  flyingSpark: {
    position: 'absolute',
    shadowColor: '#FF6C24',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});

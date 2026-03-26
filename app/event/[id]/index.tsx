import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle, Polyline } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { GlassCard } from '../../../src/components/GlassCard';
import { VerifiedBadge } from '../../../src/components/VerifiedBadge';
import { RoutePreview } from '../../../src/components/RoutePreview';
import { FONTS, COLORS } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useUserStore } from '../../../src/stores/userStore';
import { useEventStore, type EventParticipant, type EventComment } from '../../../src/stores/eventStore';
import { supabase } from '../../../src/lib/supabase';

const isWeb = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}
const hapticImpact = (style: any) => { try { Haptics?.impactAsync(style); } catch {} };
const hapticNotify = (type: any) => { try { Haptics?.notificationAsync(type); } catch {} };

let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {}

const HERO_HEIGHT = 280;
const EVENT_BG = require('../../../assets/kurv-event-bg.png');
const THUNDER_ANIM = require('../../../assets/thunder-energia.json');
const RUNNING_ANIM = require('../../../assets/running-dark.json');
const CLOCK_ANIM = require('../../../assets/clock.json');
const STREETVIEW_ANIM = require('../../../assets/street-view.json');
const WAY_ANIM = require('../../../assets/way.json');
const SOUND_CHARGING = require('../../../assets/sounds/spark-charging.wav');
const SOUND_RELEASE = require('../../../assets/sounds/spark-release.wav');
const CHARGE_MS = 2500; // 2.5s for crowd to cross

const webGlass = isWeb
  ? ({
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    } as any)
  : {};

// ─── Icons ───────────────────────────────────────────────────────

function ChevronBackIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function MapPinIcon({ size = 16, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <SvgCircle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function ClockIcon({ size = 16, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <SvgCircle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function RouteIcon({ size = 16, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <SvgCircle cx="6" cy="19" r="3" />
      <Path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <SvgCircle cx="18" cy="5" r="3" />
    </Svg>
  );
}

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13" />
      <Path d="M22 2L15 22 11 13 2 9z" />
    </Svg>
  );
}

function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18" />
      <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </Svg>
  );
}

function UsersIcon({ size = 16, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <SvgCircle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function SparkIcon({ size = 16, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function CalendarIcon({ size = 16, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 2v4M16 2v4" />
      <Path d="M3 10h18" />
      <Path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" />
    </Svg>
  );
}

function CheckIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatEventDate(dateStr: string | null): { day: string; month: string; full: string } {
  if (!dateStr) return { day: '', month: 'EM BREVE', full: 'Em breve' };
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthsFull = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekdays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  return {
    day: String(d.getDate()),
    month: months[d.getMonth()],
    full: `${weekdays[d.getDay()]}, ${d.getDate()} de ${monthsFull[d.getMonth()]}`,
  };
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '--:--';
  return timeStr.substring(0, 5);
}

// ─── Avatar Component ────────────────────────────────────────────

function UserAvatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const colors: [string, string][] = [
    ['#FF6C24', '#FFAC7D'],
    ['#FF8540', '#FF6C24'],
    ['#FFAC7D', '#FF8540'],
  ];
  const colorIndex = (name?.charCodeAt(0) ?? 0) % colors.length;

  if (avatarUrl) {
    return (
      <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={colors[colorIndex]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[s.avatarText, { fontSize: size * 0.32 }]}>{getInitials(name || '??')}</Text>
    </LinearGradient>
  );
}

// ─── Participant Avatar ──────────────────────────────────────────

function ParticipantAvatar({ participant }: { participant: EventParticipant }) {
  const size = 40;

  if (participant.is_private) {
    return (
      <View style={{ marginRight: -8 }}>
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
          style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#0D0D0D' }]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.8}>
            <SvgCircle cx="12" cy="8" r="5" />
            <Path d="M20 21a8 8 0 1 0-16 0" />
          </Svg>
        </LinearGradient>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={{ marginRight: -8 }}
      activeOpacity={0.7}
      onPress={() => router.push(`/user/${participant.user_id}`)}
    >
      <View style={{ position: 'relative' }}>
        {participant.avatar_url ? (
          <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#0D0D0D' }]}>
            <Image source={{ uri: participant.avatar_url }} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }} />
          </View>
        ) : (
          <LinearGradient
            colors={['#FF6C24', '#FFAC7D']}
            style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#0D0D0D' }]}
          >
            <Text style={[s.avatarText, { fontSize: size * 0.3 }]}>{getInitials(participant.name)}</Text>
          </LinearGradient>
        )}
        {participant.is_verified && (
          <View style={{ position: 'absolute', bottom: -2, right: -2 }}>
            <VerifiedBadge size={14} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Comment Row ─────────────────────────────────────────────────

function CommentRow({ comment, isOwn, onDelete }: { comment: EventComment; isOwn: boolean; onDelete: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={s.commentRow}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/user/${comment.user_id}`)}>
        <UserAvatar name={comment.user_name} avatarUrl={comment.user_avatar} size={32} />
      </TouchableOpacity>
      <View style={s.commentBody}>
        <View style={s.commentHeader}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/user/${comment.user_id}`)}>
            <Text style={s.commentName}>{comment.user_name}</Text>
          </TouchableOpacity>
          {comment.is_verified && <VerifiedBadge size={12} />}
          <Text style={s.commentTime}>{timeAgo(comment.created_at)}</Text>
          {isOwn && (
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 'auto' }}>
              <TrashIcon size={14} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.commentContent}>{comment.content}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Lottie Info Column (plays once on mount + on tap) ──────────
function InfoLottieCol({ source, value, label, link }: { source: any; value: string; label: string; link?: string | null }) {
  const ref = useRef<LottieView>(null);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.infoCol}
      onPress={() => {
        ref.current?.reset(); ref.current?.play();
        if (link) Linking.openURL(link);
      }}
    >
      <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        <LottieView ref={ref} source={source} autoPlay loop={false} speed={0.8} style={{ width: 36, height: 36 }} />
      </View>
      <Text style={[s.infoValue, link ? { color: '#FF8540' } : null]} numberOfLines={1}>{value}</Text>
      <Text style={s.infoLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const profile = useUserStore((s) => s.profile);
  const { event, comments, isLoading, isConfirming, fetchEvent, fetchComments, confirmEvent, cancelEvent, addComment, deleteComment, clearEvent } = useEventStore();

  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [mentions, setMentions] = useState<{ userId: string; name: string; avatar_url: string | null }[]>([]);
  const mentionCacheRef = useRef<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const inputRef = useRef<TextInput>(null);

  // ── Hold-to-charge (copied from FollowButton pattern) ──
  const progress = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const whiteFlash = useSharedValue(0);
  const isHolding = useRef(false);
  const chargeTimer = useRef<NodeJS.Timeout | null>(null);
  const vibTimer = useRef<NodeJS.Timeout | null>(null);
  const chargingSoundRef = useRef<any>(null);
  const evRunnerRef = useRef<LottieView>(null);
  const evThunderRef = useRef<LottieView>(null);

  const [kmDisplay, setKmDisplay] = useState('0.0');
  const [isCharging, setIsCharging] = useState(false);
  const [showChargeParticles, setShowChargeParticles] = useState(false);

  useEffect(() => {
    return () => {
      chargingSoundRef.current?.unloadAsync();
      if (chargeTimer.current) clearTimeout(chargeTimer.current);
      if (vibTimer.current) clearTimeout(vibTimer.current);
    };
  }, []);

  // km counter: 0.0 → spark_cost (e.g. 0.0 → 2.0)
  const updateKm = useCallback((val: number) => {
    const cost = useEventStore.getState().event?.spark_cost ?? 0;
    setKmDisplay(cost > 0 ? (val * cost).toFixed(1) : val.toFixed(1));
  }, []);

  useAnimatedReaction(
    () => progress.value,
    (val) => { runOnJS(updateKm)(val); },
    [progress],
  );

  // Runner moves left→right (EXACT same pattern as FollowButton)
  const evRunnerStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 85}%` as any,
    opacity: progress.value > 0 ? 1 : 0,
  }));

  const evGlowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
  }));

  const evFlashStyle = useAnimatedStyle(() => ({
    opacity: whiteFlash.value,
    transform: [{ scale: 1 + whiteFlash.value * 3 }],
  }));

  // Sound
  const playRelease = async () => {
    if (!Audio) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_RELEASE);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((st: any) => { if (st.isLoaded && st.didJustFinish) sound.unloadAsync(); });
    } catch {}
  };
  const startSound = async () => {
    if (!Audio) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_CHARGING);
      chargingSoundRef.current = sound;
      await sound.playAsync();
    } catch {}
  };
  const stopSound = async () => {
    try { await chargingSoundRef.current?.stopAsync(); await chargingSoundRef.current?.unloadAsync(); chargingSoundRef.current = null; } catch {}
  };

  // Vibration
  const startVibration = () => {
    let count = 0;
    const vib = () => {
      count++;
      const p = Math.min(count / (CHARGE_MS / 100), 1);
      if (Platform.OS !== 'web' && Haptics) {
        if (p > 0.8) hapticImpact(Haptics?.ImpactFeedbackStyle?.Heavy);
        else if (p > 0.5) hapticImpact(Haptics?.ImpactFeedbackStyle?.Medium);
        else hapticImpact(Haptics?.ImpactFeedbackStyle?.Light);
      }
      vibTimer.current = setTimeout(vib, Math.max(50, 160 - p * 110));
    };
    vibTimer.current = setTimeout(vib, 160);
  };

  // Direct confirm
  const doConfirm = useCallback(async () => {
    console.log('doConfirm called, id:', id, 'userId:', userId);
    if (!id || !userId) { console.log('doConfirm: missing id or userId'); return; }
    const result = await confirmEvent(id, userId);
    console.log('doConfirm result:', result);
    if (result === 'success') {
      Alert.alert('Presença confirmada!', event?.spark_cost && event.spark_cost > 0
        ? `${event.spark_cost} km foram descontados. Nos vemos la!`
        : 'Nos vemos la!');
      useUserStore.getState().fetchProfile(userId);
      // Refetch event to get updated participants list
      fetchEvent(id, userId);
    } else if (result === 'already_confirmed') {
      Alert.alert('Já confirmado', 'Você já confirmou presença neste evento.');
    } else if (result === 'event_full') {
      Alert.alert('Evento lotado', 'O numero maximo de participantes foi atingido.');
    } else if (result === 'insufficient_sparks') {
      Alert.alert('Sparks insuficientes', 'Você não tem sparks suficientes.');
    } else {
      Alert.alert('Erro', `Não foi possível confirmar. Resultado: ${result}`);
    }
  }, [id, userId, event?.spark_cost, confirmEvent, fetchEvent]);
  const doConfirmRef = useRef(doConfirm);
  doConfirmRef.current = doConfirm;

  // Complete (same structure as FollowButton.completeCharge)
  const completeCharge = useCallback(() => {
    isHolding.current = false;
    setIsCharging(false);
    if (vibTimer.current) clearTimeout(vibTimer.current);
    stopSound();
    playRelease();

    const cost = event?.spark_cost ?? 0;
    setKmDisplay(cost > 0 ? cost.toFixed(1) : '1.0');

    whiteFlash.value = withSequence(
      withTiming(0.6, { duration: 50 }),
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    // Runner sai pela direita e some (vai pra 1.3 = fora do botão)
    progress.value = withTiming(1.3, { duration: 400, easing: Easing.in(Easing.quad) });
    glowIntensity.value = withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) });

    setShowChargeParticles(true);
    setTimeout(() => setShowChargeParticles(false), 1200);

    evThunderRef.current?.reset();
    evThunderRef.current?.play();

    if (Platform.OS !== 'web' && Haptics) {
      hapticImpact(Haptics?.ImpactFeedbackStyle?.Heavy);
      setTimeout(() => hapticNotify(Haptics?.NotificationFeedbackType?.Success), 200);
    }

    setTimeout(() => doConfirmRef.current(), 800);
  }, [event]);

  // Start (same structure as FollowButton.startCharging)
  const startCharging = () => {
    if (isConfirming || isHolding.current) return;
    isHolding.current = true;
    setIsCharging(true);
    setKmDisplay('0.0');

    setTimeout(() => { evRunnerRef.current?.reset(); evRunnerRef.current?.play(); }, 50);

    progress.value = withTiming(1, { duration: CHARGE_MS, easing: Easing.linear });
    glowIntensity.value = withTiming(0.5, { duration: CHARGE_MS, easing: Easing.out(Easing.quad) });

    startSound();
    startVibration();
    chargeTimer.current = setTimeout(completeCharge, CHARGE_MS);
  };

  // Cancel (same structure as FollowButton.cancelCharging)
  const cancelCharging = () => {
    if (!isHolding.current) return;
    isHolding.current = false;
    setIsCharging(false);
    if (chargeTimer.current) { clearTimeout(chargeTimer.current); chargeTimer.current = null; }
    if (vibTimer.current) { clearTimeout(vibTimer.current); vibTimer.current = null; }
    stopSound();

    progress.value = withTiming(0, { duration: 150 });
    glowIntensity.value = withTiming(0, { duration: 150 });
    setKmDisplay('0.0');
  };

  // ── Data Fetch ──
  useFocusEffect(
    useCallback(() => {
      if (id && userId) {
        fetchEvent(id, userId);
        fetchComments(id);
      }
      return () => clearEvent();
    }, [id, userId]),
  );

  // ── Mention Logic ──
  const fetchPartners = useCallback(async (query: string) => {
    if (!userId) return;
    if (mentionCacheRef.current.length === 0) {
      const { data } = await supabase.rpc('get_friends', { p_user_id: userId, p_viewer_id: userId });
      if (data && Array.isArray(data)) {
        mentionCacheRef.current = data.map((u: any) => ({
          id: u.id,
          name: u.name ?? 'Usuario',
          avatar_url: u.avatar_url ?? null,
        }));
      }
    }
    const filtered = query.length > 0
      ? mentionCacheRef.current.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
      : mentionCacheRef.current;
    setMentionResults(filtered.slice(0, 4));
  }, [userId]);

  const handleTextChange = useCallback((newText: string) => {
    setCommentText(newText);
    const lastAtIndex = newText.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const afterAt = newText.substring(lastAtIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        setMentionQuery(afterAt);
        fetchPartners(afterAt);
        return;
      }
    }
    setMentionQuery(null);
    setMentionResults([]);
  }, [fetchPartners]);

  const selectMention = useCallback((user: { id: string; name: string; avatar_url: string | null }) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex < 0) return;
    const firstName = user.name.split(' ')[0];
    const newText = commentText.substring(0, lastAtIndex) + `@${firstName} `;
    setCommentText(newText);
    setMentions((prev) => prev.some(m => m.userId === user.id) ? prev : [...prev, { userId: user.id, name: user.name, avatar_url: user.avatar_url }]);
    setMentionQuery(null);
    setMentionResults([]);
  }, [commentText]);

  // ── Confirm Handler ──
  const handleConfirm = useCallback(async () => {
    if (!id || !userId || !event) return;

    if (event.viewer_confirmed) return;
    if (!event.is_active) return;

    const balance = profile?.points_balance ?? 0;
    if (event.spark_cost > 0 && balance < event.spark_cost) {
      Alert.alert('Sparks insuficientes', `Você precisa de ${event.spark_cost} sparks para participar deste evento. Seu saldo atual e ${balance}.`);
      return;
    }

    const result = await confirmEvent(id, userId);
    console.log('handleConfirm result:', result);

    if (result === 'success') {
      Alert.alert('Presença confirmada!', event.spark_cost > 0
        ? `${event.spark_cost} sparks foram descontados. Nos vemos la!`
        : 'Nos vemos la!');
      // Refresh profile to update points_balance
      if (userId) {
        useUserStore.getState().fetchProfile(userId);
      }
    } else if (result === 'insufficient_sparks') {
      Alert.alert('Sparks insuficientes', 'Você não tem sparks suficientes para este evento.');
    } else if (result === 'already_confirmed') {
      Alert.alert('Já confirmado', 'Você já confirmou presença neste evento.');
    } else if (result === 'event_full') {
      Alert.alert('Evento lotado', 'O numero maximo de participantes foi atingido.');
    } else {
      Alert.alert('Erro', 'Não foi possível confirmar sua presença. Tente novamente.');
    }
  }, [id, userId, event, profile, confirmEvent]);

  // ── Send Comment ──
  const handleSendComment = useCallback(async () => {
    if (!commentText.trim() || !userId || !id) return;
    const msg = commentText.trim();
    setCommentText('');
    setMentions([]);
    await addComment(id, userId, msg);
  }, [commentText, userId, id, addComment]);

  // ── Delete Comment ──
  const handleDeleteComment = useCallback((commentId: string) => {
    if (Platform.OS === 'web') {
      deleteComment(commentId);
      return;
    }
    Alert.alert('Apagar comentario', 'Deseja apagar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deleteComment(commentId) },
    ]);
  }, [deleteComment]);

  // ── Derived ──
  const dateInfo = useMemo(() => event ? formatEventDate(event.event_date) : null, [event?.event_date]);
  const pointsBalance = profile?.points_balance ?? 0;

  const buttonState = useMemo(() => {
    if (!event) return 'loading';
    if (!event.is_active) return 'closed';
    if (event.viewer_confirmed) return 'confirmed';
    if (event.spark_cost > 0 && pointsBalance < event.spark_cost) return 'insufficient';
    return 'available';
  }, [event, pointsBalance]);

  // ── Loading ──
  if (isLoading || !event) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#0D0D0D', '#1A1008', '#0D0D0D']} style={StyleSheet.absoluteFill} />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6C24" />
        </View>
      </View>
    );
  }

  const MAX_AVATARS = 4;
  const visibleParticipants = event.participants.slice(0, MAX_AVATARS);
  const extraCount = Math.max(0, event.participant_count - MAX_AVATARS);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0D0D0D', '#1A1008', '#201510', '#0D0D0D']} locations={[0, 0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* ── HERO IMAGE ── */}
          <View style={s.heroContainer}>
            {event.image_url ? (
              <Image source={{ uri: event.image_url }} style={s.heroImage} resizeMode="cover" />
            ) : (
              <Image source={EVENT_BG} style={s.heroImage} resizeMode="cover" />
            )}
            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(13,13,13,0.4)', 'rgba(13,13,13,0.85)', '#0D0D0D']}
              locations={[0, 0.4, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Back button */}
            <TouchableOpacity
              style={[s.backButton, { top: insets.top + 8 }]}
              activeOpacity={0.7}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
              <View style={s.backButtonInner}>
                <ChevronBackIcon size={20} />
              </View>
            </TouchableOpacity>

            {/* Title at bottom of hero */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.heroContent}>
              <Text style={s.heroTitle} numberOfLines={2}>{event.title}</Text>
              <Text style={s.heroOrganizer}>por {event.organizer_name}</Text>
            </Animated.View>
          </View>

          <View style={s.body}>
            {/* ── ORGANIZER ROW + DATE ── */}
            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <GlassCard variant="light" style={s.organizerCard}>
                <View style={s.organizerRow}>
                  <View style={s.organizerLeft}>
                    {event.organizer_logo_url === 'kukur-logo' ? (
                      <Image source={require('../../../assets/kukur-logo.png')} style={s.orgLogo} resizeMode="contain" />
                    ) : event.organizer_logo_url ? (
                      <Image source={{ uri: event.organizer_logo_url }} style={s.organizerLogo} />
                    ) : (
                      <LinearGradient
                        colors={['#FF6C24', '#FF8540']}
                        style={s.organizerLogo}
                      >
                        <Text style={s.organizerLogoText}>{getInitials(event.organizer_name)}</Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.organizerLabel}>Organizador</Text>
                      <Text style={s.organizerName}>{event.organizer_name}</Text>
                      {event.organizer_instagram && (
                        <TouchableOpacity onPress={() => Linking.openURL(`https://instagram.com/${event.organizer_instagram!.replace('@', '')}`)}>
                          <Text style={s.orgInstagram}>{event.organizer_instagram}</Text>
                        </TouchableOpacity>
                      )}
                      {event.organizer_website && (
                        <TouchableOpacity onPress={() => Linking.openURL(event.organizer_website!)}>
                          <Text style={s.orgWebsite}>{event.organizer_website.replace('https://', '')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {dateInfo && (
                    <View style={s.dateBadge}>
                      {dateInfo.day ? <Text style={s.dateBadgeDay}>{dateInfo.day}</Text> : null}
                      <Text style={[s.dateBadgeMonth, !dateInfo.day && { fontSize: 11 }]}>{dateInfo.month}</Text>
                    </View>
                  )}
                </View>
                {dateInfo && (
                  <View style={s.dateFullRow}>
                    <CalendarIcon size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={s.dateFullText}>{dateInfo.full}</Text>
                  </View>
                )}
              </GlassCard>
            </Animated.View>

            {/* ── EVENT INFO — 3 Columns ── */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <GlassCard variant="light" style={s.infoCard}>
                <View style={s.infoRow}>
                  <InfoLottieCol source={WAY_ANIM} value={event.distance_km > 0 ? `${event.distance_km}km` : '--'} label="Distância" />
                  <View style={s.infoDivider} />
                  <InfoLottieCol source={CLOCK_ANIM} value={formatTime(event.start_time)} label="Horário" />
                  <View style={s.infoDivider} />
                  <InfoLottieCol source={STREETVIEW_ANIM} value={event.location ?? '--'} label="Local" link={event.location_url} />
                </View>
              </GlassCard>
            </Animated.View>

            {/* ── SPARKS INFO ── */}
            {(event.spark_cost > 0 || event.spark_multiplier > 1) && (
              <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                <GlassCard variant="orange" style={s.sparksCard}>
                  <View style={s.sparksHeader}>
                    <LottieView source={THUNDER_ANIM} autoPlay={false} loop={false} style={s.sparkLottie} />
                    <Text style={s.sparksTitle}>Sparks</Text>
                  </View>

                  {event.spark_cost > 0 && (
                    <View style={s.sparkRow}>
                      <SparkIcon size={16} color="#FF6C24" />
                      <Text style={s.sparkRowText}>
                        Custa <Text style={s.sparkHighlight}>{event.spark_cost} sparks</Text> para participar
                      </Text>
                    </View>
                  )}

                  {event.spark_multiplier > 1 && (
                    <View style={s.multiplierRow}>
                      <View style={s.multiplierBigBadge}>
                        <LottieView source={THUNDER_ANIM} autoPlay loop style={s.multiplierLottie} />
                        <Text style={s.multiplierBigText}>{event.spark_multiplier}x</Text>
                      </View>
                      <View style={s.multiplierInfo}>
                        <Text style={s.multiplierTitle}>Multiplicador Ativo</Text>
                        <Text style={s.multiplierDesc}>
                          Cada km gera <Text style={s.sparkHighlight}>{event.spark_multiplier} sparks</Text>
                        </Text>
                      </View>
                    </View>
                  )}

                  {event.description && (
                    <View>
                      {event.description.split(/\\n|\n/).map((p, i) => (
                        p.trim() ? <Text key={i} style={[s.sparksDescription, i > 0 && { marginTop: 2 }]}>{p.trim()}</Text> : null
                      ))}
                    </View>
                  )}
                </GlassCard>
              </Animated.View>
            )}

            {/* ── Description (if no sparks section showed it) ── */}
            {event.description && event.spark_cost <= 0 && event.spark_multiplier <= 1 && (
              <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                <GlassCard variant="light" style={s.descriptionCard}>
                  <View style={{ padding: 16 }}>
                    {event.description.split(/\\n|\n/).map((paragraph, i) => (
                      paragraph.trim() ? (
                        <Text key={i} style={[s.descriptionText, i > 0 && { marginTop: 2 }]}>{paragraph.trim()}</Text>
                      ) : null
                    ))}
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            {/* ── ROUTE MAP ── */}
            {event.route_polyline && (
              <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                <GlassCard variant="light" style={s.routeCard}>
                  <Text style={s.sectionTitle}>Percurso</Text>
                  <View style={s.routePreviewWrapper}>
                    <RoutePreview
                      polyline={event.route_polyline}
                      width={SW - 64}
                      height={150}
                      showMap
                    />
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            {/* ── PARTICIPANTS (bolinhas → abre página) ── */}
            {event.participant_count > 0 && (
              <Animated.View entering={FadeInDown.delay(350).duration(500)}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push(`/event/${id}/participants`)}
                  style={s.stackedRow}
                >
                  {visibleParticipants.map((p, i) => (
                    <View key={p.user_id} style={[s.stackedAvatar, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -10 }]}>
                      <UserAvatar name={p.name} avatarUrl={p.avatar_url} size={34} />
                    </View>
                  ))}
                  {extraCount > 0 && (
                    <View style={[s.stackedExtra, { zIndex: 0, marginLeft: -10 }]}>
                      <Text style={s.stackedExtraText}>+{extraCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── COMMENTS ── */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Comentarios</Text>
                <Text style={s.sectionSub}>{comments.length}</Text>
              </View>

              <GlassCard variant="light" style={s.commentsCard}>
                {comments.length === 0 ? (
                  <Text style={s.emptyText}>Nenhum comentario ainda. Seja o primeiro!</Text>
                ) : (
                  comments.map((c) => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      isOwn={c.user_id === userId}
                      onDelete={() => handleDeleteComment(c.id)}
                    />
                  ))
                )}

                {/* Mention dropdown */}
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <View style={s.mentionDropdown}>
                    {mentionResults.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={s.mentionItem}
                        activeOpacity={0.7}
                        onPress={() => selectMention(u)}
                      >
                        <UserAvatar name={u.name} avatarUrl={u.avatar_url} size={24} />
                        <Text style={s.mentionName}>{u.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Comment input */}
                <View style={s.commentInputRow}>
                  <TextInput
                    ref={inputRef}
                    style={s.commentInput}
                    placeholder="Escreva um comentario..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={commentText}
                    onChangeText={handleTextChange}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[s.sendButton, !commentText.trim() && { opacity: 0.3 }]}
                    activeOpacity={0.7}
                    onPress={handleSendComment}
                    disabled={!commentText.trim()}
                  >
                    <SendIcon size={18} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </Animated.View>
          </View>
        </ScrollView>

        {/* ── STICKY BOTTOM BUTTON ── */}
        <View style={[s.stickyBottom, { paddingBottom: insets.bottom + 8 }]}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}

          {buttonState === 'available' && (
            <View style={s.chargeWrap}>
              {/* Glow */}
              <Animated.View style={[s.evGlow, evGlowStyle]} pointerEvents="none" />

              {/* Thunder */}
              {showChargeParticles && (
                <View style={s.evLottie} pointerEvents="none">
                  <LottieView ref={evThunderRef} source={THUNDER_ANIM} autoPlay loop={false} speed={1.2} style={{ width: 90, height: 90 }} />
                </View>
              )}

              {/* Flash */}
              <Animated.View style={[s.evFlash, evFlashStyle]} pointerEvents="none" />

              <Pressable onPressIn={startCharging} onPressOut={cancelCharging} disabled={isConfirming} style={{ width: '100%' }}>
                <View style={s.evBtn}>
                  <LinearGradient
                    colors={['#FF6C24', '#FF8540']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 27 }]}
                  />

                  {/* Runner Lottie — moves across button */}
                  <Animated.View style={[s.evRunner, evRunnerStyle]}>
                    <LottieView
                      ref={evRunnerRef}
                      source={RUNNING_ANIM}
                      autoPlay={true}
                      loop={true}
                      speed={2.5}
                      renderMode="AUTOMATIC"
                      style={s.evRunnerLottie}
                    />
                  </Animated.View>

                  {/* KM counter centered */}
                  {isConfirming ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : isCharging ? (
                    <View style={s.evContent}>
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={1.5}>
                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </Svg>
                      <Text style={s.evKmCounter}>{kmDisplay}</Text>
                      <Text style={s.evKmUnit}>km</Text>
                    </View>
                  ) : (
                    <View style={s.evContent}>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={1.5}>
                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </Svg>
                      <Text style={s.evLabel}>Segure para confirmar</Text>
                      {event.spark_cost > 0 && (
                        <View style={s.evCostBadge}>
                          <Text style={s.evCostText}>{event.spark_cost} km</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          )}

          {buttonState === 'insufficient' && (
            <View style={s.disabledButton}>
              <Text style={s.disabledButtonText}>Sparks insuficientes</Text>
            </View>
          )}

          {buttonState === 'confirmed' && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.confirmedButton}
              onPress={() => {
                Alert.alert(
                  'Cancelar presença?',
                  event.spark_cost > 0
                    ? `Você receberá ${event.spark_cost} km de volta.`
                    : 'Sua presença será cancelada.',
                  [
                    { text: 'Voltar', style: 'cancel' },
                    {
                      text: 'Cancelar presença',
                      style: 'destructive',
                      onPress: async () => {
                        if (!id || !userId) return;
                        const res = await cancelEvent(id, userId);
                        if (res === 'success') {
                          useUserStore.getState().fetchProfile(userId);
                          fetchEvent(id, userId);
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={s.confirmedButtonText}>Presença confirmada ✓</Text>
            </TouchableOpacity>
          )}

          {buttonState === 'closed' && (
            <View style={s.disabledButton}>
              <Text style={s.disabledButtonText}>Evento encerrado</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  heroContainer: {
    width: '100%',
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: isWeb ? 'rgba(0,0,0,0.4)' : 'transparent',
    zIndex: 10,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontFamily: FONTS.playfair.bold,
    fontSize: 28,
    color: '#fff',
    lineHeight: 34,
  },
  heroOrganizer: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  // Body
  body: {
    paddingHorizontal: 16,
    marginTop: 8,
  },

  // Organizer Card
  organizerCard: {
    marginBottom: 16,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  organizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  organizerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  organizerLogoText: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 14,
    color: '#fff',
  },
  organizerLabel: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  organizerName: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 15,
    color: '#fff',
    marginTop: 1,
  },
  orgLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  orgInstagram: {
    fontFamily: FONTS.montserrat.medium,
    fontSize: 12,
    color: '#FF6C24',
    marginTop: 3,
  },
  orgWebsite: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: 'rgba(255,108,36,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.25)',
  },
  dateBadgeDay: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 20,
    color: '#FF6C24',
    lineHeight: 22,
  },
  dateBadgeMonth: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 10,
    color: '#FF8540',
    letterSpacing: 1,
  },
  dateFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  dateFullText: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },

  // Info Card — 3 columns
  infoCard: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoValue: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
  },
  infoLabel: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  infoDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Sparks Card
  sparksCard: {
    marginBottom: 16,
  },
  sparksColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 0,
  },
  sparkCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  sparkColValue: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 28,
    color: '#FF6C24',
  },
  sparkColMultiplier: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 32,
    color: '#FF6C24',
  },
  sparkColLabel: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  sparkColDivider: {
    width: 0.5,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sparksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  sparkLottie: {
    width: 28,
    height: 28,
  },
  sparksTitle: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 16,
    color: '#FF6C24',
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sparkRowText: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  sparkHighlight: {
    fontFamily: FONTS.montserrat.bold,
    color: '#FF6C24',
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  multiplierBigBadge: {
    backgroundColor: 'rgba(255,108,36,0.15)',
    borderRadius: 16,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,108,36,0.25)',
    position: 'relative',
  },
  multiplierLottie: {
    width: 24,
    height: 24,
    position: 'absolute',
    top: 4,
    right: 4,
  },
  multiplierBigText: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 24,
    color: '#FF6C24',
  },
  multiplierInfo: {
    flex: 1,
    gap: 2,
  },
  multiplierTitle: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 14,
    color: '#fff',
  },
  multiplierDesc: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  sparksDescription: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    lineHeight: 20,
  },

  // Description Card
  descriptionCard: {
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },

  // Route Card
  routeCard: {
    marginBottom: 16,
  },
  routePreviewWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 16,
    color: '#fff',
  },
  sectionSub: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,108,36,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 12,
    color: '#FF6C24',
  },

  // Participants
  stackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: '#0D0D0D',
    borderRadius: 17,
    overflow: 'hidden',
  },
  stackedExtra: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 2,
    borderColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedExtraText: {
    fontFamily: FONTS.montserrat.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  participantRowName: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  collapseBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  collapseBtnText: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  participantsScroll: {
    paddingLeft: 16,
    paddingRight: 24,
    paddingVertical: 4,
  },
  moreAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0D0D0D',
  },
  moreAvatarText: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyParticipants: {
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    padding: 20,
  },

  // Comments
  commentsCard: {
    marginBottom: 16,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  commentName: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 12,
    color: '#fff',
  },
  commentTime: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  commentContent: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    lineHeight: 19,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontFamily: FONTS.montserrat.regular,
    fontSize: 13,
    color: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,108,36,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionDropdown: {
    marginHorizontal: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mentionName: {
    fontFamily: FONTS.montserrat.medium,
    fontSize: 13,
    color: '#fff',
  },

  // Avatar (shared)
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
  },

  // Sticky Bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: isWeb ? 'rgba(13,13,13,0.92)' : 'transparent',
    ...webGlass,
  },
  chargeWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    marginHorizontal: 16,
  },
  evGlow: {
    position: 'absolute',
    width: '110%',
    height: '160%',
    borderRadius: 100,
    backgroundColor: 'rgba(255,108,36,0.2)',
    zIndex: -1,
  },
  evLottie: {
    position: 'absolute',
    zIndex: 25,
    width: 90,
    height: 90,
  },
  evFlash: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,172,125,0.5)',
    zIndex: 30,
  },
  evBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 27,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#FF6C24',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  evRunner: {
    position: 'absolute',
    top: -18,
    zIndex: 4,
  },
  evRunnerLottie: {
    width: 65,
    height: 65,
  },
  evContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 5,
  },
  evKmCounter: {
    fontFamily: FONTS.montserrat.extrabold,
    fontSize: 19,
    color: '#fff',
    includeFontPadding: false,
  },
  evKmUnit: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: -2,
  },
  evLabel: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 14,
  },
  evCostBadge: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 2,
  },
  evCostText: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
    fontSize: 10,
  },
  disabledButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledButtonText: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
  confirmedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,108,36,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.2)',
    marginHorizontal: 16,
  },
  confirmedButtonText: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 14,
    color: '#FF6C24',
  },
});

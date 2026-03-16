import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Alert,
  FlatList,
} from 'react-native';
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle, Polyline, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { Logo } from '../../src/components/Logo';
import { GlassCard } from '../../src/components/GlassCard';
import { FONTS, COLORS } from '../../src/constants/theme';
import { useScrollY } from '../../src/context/ScrollContext';
import { useAuthStore } from '../../src/stores/authStore';
import { useUserStore } from '../../src/stores/userStore';
import { useCommunityStore, type CommunityPost, type PostType, type TopMember, type FeedFilter } from '../../src/stores/communityStore';
import { supabase } from '../../src/lib/supabase';

const isWeb = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

const webGlass = isWeb
  ? ({
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    } as any)
  : {};

// ─── Lottie Assets ───────────────────────────────────────────────
const FIRE_ANIM = require('../../assets/fire-emoji.json');
const AWARD_ANIM = require('../../assets/award-emoji.json');
const CELEBRATION_ANIM = require('../../assets/celebration.json');
const THUNDER_ANIM = require('../../assets/thunder-energia.json');

// ─── Filter Tabs ─────────────────────────────────────────────────
// FeedFilter type is now imported from communityStore

// ─── Icons ───────────────────────────────────────────────────────

function EnergiaIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  const color = active ? '#FF6C24' : 'rgba(255,255,255,0.35)';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function CommentIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

function CheckCircleIcon({ size = 14, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

function TrophyIcon({ size = 14, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
      <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
      <Path d="M4 22h16" />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </Svg>
  );
}

function FireIcon({ size = 14, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Svg>
  );
}

function ImageIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
      <SvgCircle cx="8.5" cy="8.5" r="1.5" />
      <Path d="m21 15-5-5L5 21" />
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

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Svg>
  );
}

function UsersIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <SvgCircle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function getPostText(post: CommunityPost): string {
  switch (post.type) {
    case 'lesson_complete':
      return `completou a aula "${post.metadata?.lesson_title ?? 'uma aula'}"`;
    case 'module_complete':
      return `finalizou o módulo "${post.metadata?.module_title ?? 'um módulo'}"`;
    case 'streak':
      return `está em uma sequência de ${post.metadata?.streak_days ?? '?'} dias!`;
    case 'challenge_join':
      return `entrou no desafio "${post.metadata?.challenge_title ?? 'um desafio'}"`;
    case 'text':
      return post.content ?? '';
    default:
      return post.content ?? '';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function matchesFilter(post: CommunityPost, filter: FeedFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'conquistas') return ['lesson_complete', 'module_complete', 'streak'].includes(post.type);
  if (filter === 'desafios') return post.type === 'challenge_join';
  if (filter === 'fotos') return post.type === 'photo' || !!post.image_url;
  return true;
}

// ─── Avatar Component ────────────────────────────────────────────

function UserAvatar({ name, avatarUrl, size = 36, ring = false }: { name: string; avatarUrl?: string | null; size?: number; ring?: boolean }) {
  const colors: [string, string][] = [
    ['#FF6C24', '#FFAC7D'],
    ['#FF8540', '#FF6C24'],
    ['#FFAC7D', '#FF8540'],
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;

  const renderInner = (extraStyle?: any) => {
    if (avatarUrl) {
      return (
        <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }, extraStyle]}>
          <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        </View>
      );
    }
    return (
      <LinearGradient
        colors={colors[colorIndex]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }, extraStyle]}
      >
        <Text style={[s.avatarText, { fontSize: size * 0.32 }]}>{getInitials(name)}</Text>
      </LinearGradient>
    );
  };

  if (ring) {
    const outerSize = size + 4;
    return (
      <View style={{ width: outerSize, height: outerSize, borderRadius: outerSize / 2, padding: 2 }}>
        <LinearGradient
          colors={['#FF6C24', '#FFAC7D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: outerSize / 2 }]}
        />
        {renderInner({ borderWidth: 1.5, borderColor: '#0D0D0D' })}
      </View>
    );
  }

  return renderInner();
}

// ─── Weekly Highlight / Top Members ──────────────────────────────
// Backend: query profiles ORDER BY points_balance DESC LIMIT 5
// For now uses data from the community posts (most energia)

function TopMembersSection({ members, onMemberPress }: { members: TopMember[]; onMemberPress: (userId: string) => void }) {
  if (members.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Rank da Semana</Text>
        <Text style={s.sectionSub}>esta semana</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topScroll}>
        {members.map((u, i) => (
          <TouchableOpacity key={u.user_id} style={s.topCard} activeOpacity={0.7} onPress={() => onMemberPress(u.user_id)}>
            {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
            <LinearGradient
              colors={i === 0 ? ['rgba(255,108,36,0.14)', 'rgba(255,108,36,0.04)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Specular */}
            <LinearGradient
              colors={['transparent', i === 0 ? 'rgba(255,180,130,0.12)' : 'rgba(255,255,255,0.06)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.topSpecular}
            />
            {/* Rank badge */}
            {i < 3 && (
              <View style={[s.rankBadge, i === 0 && s.rankBadgeFirst]}>
                <Text style={[s.rankText, i === 0 && s.rankTextFirst]}>#{i + 1}</Text>
              </View>
            )}
            <UserAvatar name={u.user_name} avatarUrl={u.avatar_url} size={40} ring={i === 0} />
            <Text style={s.topName} numberOfLines={1}>{u.user_name.split(' ')[0]}</Text>
            {u.weekly_km > 0 && (
              <Text style={s.topKm}>{u.weekly_km.toFixed(1)} km</Text>
            )}
            <View style={s.topStatRow}>
              <EnergiaIcon size={12} active />
              <Text style={s.topStatValue}>{u.weekly_energia}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Achievement Card (Module Complete / Streak) ─────────────────

function AchievementCard({ post }: { post: CommunityPost }) {
  const isModule = post.type === 'module_complete';
  const isStreak = post.type === 'streak';

  return (
    <View style={s.achieveCard}>
      <LinearGradient
        colors={
          isModule
            ? ['rgba(255,108,36,0.18)', 'rgba(255,133,64,0.08)', 'rgba(255,172,125,0.12)']
            : ['rgba(255,172,125,0.14)', 'rgba(255,108,36,0.06)', 'rgba(255,133,64,0.10)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Orange glow specular */}
      <LinearGradient
        colors={['transparent', 'rgba(255,200,170,0.35)', 'rgba(255,230,210,0.45)', 'rgba(255,200,170,0.35)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.achieveSpecular}
      />
      {/* Inner border glow */}
      <View style={s.achieveInnerBorder} />

      <View style={s.achieveContent}>
        {/* Lottie */}
        <View style={s.achieveLottie}>
          <LottieView
            source={isModule ? CELEBRATION_ANIM : FIRE_ANIM}
            autoPlay
            loop
            speed={0.8}
            style={{ width: 48, height: 48 }}
          />
        </View>
        <View style={s.achieveTextArea}>
          <Text style={s.achieveLabel}>
            {isModule ? 'MÓDULO CONCLUÍDO' : `STREAK DE ${post.metadata?.streak_days} DIAS`}
          </Text>
          <Text style={s.achieveTitle} numberOfLines={1}>
            {isModule ? post.metadata?.module_title : `${post.metadata?.streak_days} dias consecutivos`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Post Card ───────────────────────────────────────────────────

// ─── Post Text with @Mentions ───────────────────────────────────

function MentionChip({ mention, onPress }: { mention: { userId: string; name: string; avatar_url?: string }; onPress: () => void }) {
  const firstName = mention.name.split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,108,36,0.10)',
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 10, borderWidth: 0.5,
        borderColor: 'rgba(255,108,36,0.20)',
        marginHorizontal: 2,
      }}
    >
      <View style={{
        width: 24, height: 24, borderRadius: 12, overflow: 'hidden',
        backgroundColor: 'rgba(255,108,36,0.3)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {mention.avatar_url ? (
          <Image source={{ uri: mention.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
        ) : (
          <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 11 }}>{initial}</Text>
        )}
      </View>
      <Text style={{ fontFamily: FONTS.montserrat.bold, color: '#FF6C24', fontSize: 14 }}>
        {firstName}
      </Text>
    </TouchableOpacity>
  );
}

function PostText({
  text,
  metadata,
  onMentionPress,
}: {
  text: string;
  metadata: Record<string, any>;
  onMentionPress: (userId: string) => void;
}) {
  const mentionList = metadata?.mentions as { userId: string; name: string; avatar_url?: string }[] | undefined;

  if (!mentionList || mentionList.length === 0) {
    return <Text style={s.postText}>{text}</Text>;
  }

  // Build parts: text segments + inline mention chips
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  for (const mention of mentionList) {
    const firstName = mention.name.split(' ')[0];
    const mentionTag = `@${firstName}`;
    const idx = remaining.indexOf(mentionTag);

    if (idx >= 0) {
      if (idx > 0) {
        parts.push(<Text key={key++} style={s.postText}>{remaining.substring(0, idx)}</Text>);
      }
      parts.push(
        <MentionChip
          key={key++}
          mention={mention}
          onPress={() => onMentionPress(mention.userId)}
        />
      );
      remaining = remaining.substring(idx + mentionTag.length);
    }
  }

  if (remaining) {
    parts.push(<Text key={key++} style={s.postText}>{remaining}</Text>);
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      {parts}
    </View>
  );
}

function PostCard({
  post,
  userId,
  onToggleEnergia,
  onOpenComments,
  onDelete,
  onUserPress,
  index,
}: {
  post: CommunityPost;
  userId: string | null;
  onToggleEnergia: (postId: string) => void;
  onOpenComments: (postId: string) => void;
  onDelete: (postId: string) => void;
  onUserPress: (userId: string) => void;
  index: number;
}) {
  const isAutoPost = post.type !== 'text';
  const isBigAchievement = post.type === 'module_complete' || post.type === 'streak';
  const energiaScale = useSharedValue(1);
  const lottieOpacity = useSharedValue(0);
  const svgOpacity = useSharedValue(1);
  const [thunderPhase, setThunderPhase] = useState<'idle' | 'animating' | 'fading'>('idle');
  const thunderRef = useRef<LottieView>(null);

  const energiaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: energiaScale.value }],
  }));

  const lottieStyle = useAnimatedStyle(() => ({
    opacity: lottieOpacity.value,
  }));

  const svgStyle = useAnimatedStyle(() => ({
    opacity: svgOpacity.value,
  }));

  const handleEnergia = () => {
    if (!userId) return;
    const wasReacted = post.has_reacted;
    onToggleEnergia(post.id);

    if (!wasReacted) {
      // Bounce grande só quando curte
      energiaScale.value = withSequence(
        withSpring(1.6, { damping: 6, stiffness: 400 }),
        withSpring(1, { damping: 18, stiffness: 400 }),
      );
    } else {
      // Descurtir: bounce moderado
      energiaScale.value = withSequence(
        withSpring(1.25, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 14, stiffness: 300 }),
      );
    }

    if (!wasReacted) {
      // Fade out SVG → show Lottie → play → crossfade back to SVG (now orange)
      setThunderPhase('animating');
      svgOpacity.value = withTiming(0, { duration: 100 });
      lottieOpacity.value = withTiming(1, { duration: 100 });
      setTimeout(() => thunderRef.current?.play(0), 40);

      // Don't wait for full animation - crossfade back after 800ms
      setTimeout(() => {
        setThunderPhase('fading');
        // Smoothly settle scale to 1 as SVG fades back in
        energiaScale.value = withTiming(1, { duration: 500 });
        lottieOpacity.value = withTiming(0, { duration: 500 });
        svgOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) });
        setTimeout(() => setThunderPhase('idle'), 950);
      }, 800);
    }
  };

  // Safety fallback if timeout doesn't fire
  const onThunderFinish = useCallback(() => {
    if (thunderPhase === 'animating') {
      setThunderPhase('fading');
      lottieOpacity.value = withTiming(0, { duration: 200 });
      svgOpacity.value = withTiming(1, { duration: 200 });
      setTimeout(() => setThunderPhase('idle'), 250);
    }
  }, [thunderPhase]);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 60, 300)).duration(450)} style={s.postCard}>
      {/* Glass background */}
      {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top specular */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.postSpecular}
      />

      {/* Header */}
      <View style={s.postHeader}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onUserPress(post.user_id)}>
          <UserAvatar name={post.user_name} avatarUrl={post.user_avatar} size={38} />
        </TouchableOpacity>
        <View style={s.postHeaderText}>
          <View style={s.postNameRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onUserPress(post.user_id)}>
              <Text style={s.postUserName}>{post.user_name}</Text>
            </TouchableOpacity>
            {isAutoPost && (
              <View style={[s.postTypeBadge, isBigAchievement && s.postTypeBadgeBig]}>
                {post.type === 'lesson_complete' && <CheckCircleIcon size={11} color="#FF8540" />}
                {post.type === 'module_complete' && <TrophyIcon size={11} color="#FF6C24" />}
                {post.type === 'streak' && <FireIcon size={11} color="#FFAC7D" />}
                {post.type === 'challenge_join' && <TrophyIcon size={11} color="#FF6C24" />}
              </View>
            )}
          </View>
          <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
        </View>
        {/* Menu — only for post owner */}
        {userId && post.user_id === userId && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Post', '', [
                { text: 'Excluir post', style: 'destructive', onPress: () => onDelete(post.id) },
                { text: 'Cancelar', style: 'cancel' },
              ]);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={s.deleteBtn}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)">
              <SvgCircle cx="12" cy="5" r="2" />
              <SvgCircle cx="12" cy="12" r="2" />
              <SvgCircle cx="12" cy="19" r="2" />
            </Svg>
          </TouchableOpacity>
        )}
      </View>

      {/* Big achievement visual card */}
      {isBigAchievement && <AchievementCard post={post} />}

      {/* Content text */}
      <View style={s.postBody}>
        {isAutoPost ? (
          <Text style={s.postText}>
            <Text style={s.postTextBold}>{post.user_name}</Text>{' '}
            {getPostText(post)}
          </Text>
        ) : (
          <PostText
            text={post.content ?? ''}
            metadata={post.metadata}
            onMentionPress={onUserPress}
          />
        )}
      </View>

      {/* Post image */}
      {post.image_url && (
        <View style={s.postImageWrap}>
          <Image
            source={{ uri: post.image_url }}
            style={s.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Context card for lesson complete */}
      {post.type === 'lesson_complete' && post.metadata?.module_title && (
        <View style={s.contextCard}>
          <LinearGradient
            colors={['rgba(255,108,36,0.08)', 'rgba(255,108,36,0.02)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.contextIcon}>
            <CheckCircleIcon size={13} color="#FF8540" />
          </View>
          <View style={s.contextText}>
            <Text style={s.contextTitle} numberOfLines={1}>
              {post.metadata.lesson_title ?? post.metadata.module_title}
            </Text>
            {post.metadata.lesson_title && post.metadata.module_title && (
              <Text style={s.contextSub} numberOfLines={1}>
                {post.metadata.module_title}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Challenge join card */}
      {post.type === 'challenge_join' && post.metadata?.challenge_title && (
        <View style={s.challengeJoinCard}>
          <LinearGradient
            colors={['rgba(255,108,36,0.12)', 'rgba(255,108,36,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.challengeJoinIcon}>
            <TrophyIcon size={16} color="#FF6C24" />
          </View>
          <View style={s.challengeJoinText}>
            <Text style={s.challengeJoinTitle}>{post.metadata.challenge_title}</Text>
            <View style={s.challengeJoinMeta}>
              <UsersIcon size={11} />
              <Text style={s.challengeJoinCount}>
                {post.metadata?.participant_count ?? 0} participantes
              </Text>
            </View>
          </View>
          <View style={s.challengeJoinBadge}>
            <Text style={s.challengeJoinBadgeText}>Entrou</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={s.postActions}>
        <TouchableOpacity style={s.actionBtn} activeOpacity={0.6} onPress={handleEnergia}>
          <Animated.View style={[s.actionInner, energiaAnimStyle]}>
            {/* SVG icon (visible when idle) */}
            <Animated.View style={[s.iconAbsolute, svgStyle]}>
              <EnergiaIcon size={17} active={post.has_reacted} />
            </Animated.View>
            {/* Lottie thunder (visible when animating) */}
            {thunderPhase !== 'idle' && (
              <Animated.View style={[s.iconAbsolute, lottieStyle]}>
                <LottieView
                  ref={thunderRef}
                  source={THUNDER_ANIM}
                  loop={false}
                  speed={2}
                  onAnimationFinish={onThunderFinish}
                  style={{ width: 30, height: 30 }}
                />
              </Animated.View>
            )}
          </Animated.View>
          <Text style={[s.actionText, post.has_reacted && s.actionTextActive]}>
            {post.energia_count > 0 ? `${post.energia_count}` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} activeOpacity={0.6} onPress={() => onOpenComments(post.id)}>
          <CommentIcon size={15} />
          <Text style={s.actionText}>
            {post.comment_count > 0 ? `${post.comment_count}` : 'Comentar'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Comments Sheet ──────────────────────────────────────────────

function CommentsSection({
  postId,
  userId,
  onClose,
}: {
  postId: string;
  userId: string | null;
  onClose: () => void;
}) {
  const { comments, fetchComments, addComment, deleteComment } = useCommunityStore();
  const [text, setText] = useState('');
  const cache = comments[postId];
  const postComments = cache?.items ?? [];

  // Mention state for comments
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [mentions, setMentions] = useState<{ userId: string; name: string; avatar_url?: string | null }[]>([]);
  const mentionCacheRef = useRef<{ id: string; name: string; avatar_url: string | null }[]>([]);

  const fetchPartners = useCallback(async (query: string) => {
    if (!userId) return;
    if (mentionCacheRef.current.length === 0) {
      const { data } = await supabase.rpc('get_friends', { p_user_id: userId, p_viewer_id: userId });
      if (data && Array.isArray(data)) {
        mentionCacheRef.current = data.map((u: any) => ({ id: u.id, name: u.name ?? 'Usuario', avatar_url: u.avatar_url ?? null }));
      }
    }
    const filtered = query.length > 0
      ? mentionCacheRef.current.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
      : mentionCacheRef.current;
    setMentionResults(filtered.slice(0, 4));
  }, [userId]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
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
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex < 0) return;
    const firstName = user.name.split(' ')[0];
    const newText = text.substring(0, lastAtIndex) + `@${firstName} `;
    setText(newText);
    setMentions((prev) => prev.some(m => m.userId === user.id) ? prev : [...prev, { userId: user.id, name: user.name, avatar_url: user.avatar_url }]);
    setMentionQuery(null);
    setMentionResults([]);
  }, [text]);

  useEffect(() => {
    fetchComments(postId);
  }, [postId]);

  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    const msg = text.trim();
    setText('');
    setMentions([]);
    // TODO: store mentions in comment metadata when backend supports it
    await addComment(postId, userId, msg);
  };

  return (
    <Animated.View entering={FadeInUp.duration(280)} style={s.commentsSheet}>
      {!isWeb && <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />}
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Handle bar */}
      <View style={s.commentsHandle} />

      {/* Header */}
      <View style={s.commentsHeader}>
        <Text style={s.commentsTitle}>Comentários</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.commentsClose}>Fechar</Text>
        </TouchableOpacity>
      </View>

      {/* Comments list */}
      <ScrollView style={s.commentsList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* Load more (older comments) */}
        {cache?.hasMore && postComments.length > 0 && (
          <TouchableOpacity
            onPress={() => fetchComments(postId, true)}
            style={s.loadMoreComments}
            disabled={cache?.isLoading}
          >
            <Text style={s.loadMoreText}>
              {cache?.isLoading ? 'Carregando...' : 'Carregar anteriores'}
            </Text>
          </TouchableOpacity>
        )}
        {postComments.length === 0 && !cache?.isLoading && (
          <Text style={s.commentsEmpty}>Nenhum comentário ainda. Seja o primeiro!</Text>
        )}
        {postComments.map((c) => (
          <View key={c.id} style={s.commentRow}>
            <UserAvatar name={c.user_name} avatarUrl={c.user_avatar} size={28} />
            <View style={s.commentContent}>
              <Text style={s.commentMsg}>
                <Text style={s.commentName}>{c.user_name}</Text> {c.content}
              </Text>
              <Text style={s.commentTime}>{timeAgo(c.created_at)}</Text>
            </View>
            {userId && c.user_id === userId && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Comentário', '', [
                    { text: 'Excluir', style: 'destructive', onPress: () => deleteComment(c.id, postId, userId) },
                    { text: 'Cancelar', style: 'cancel' },
                  ]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="rgba(255,255,255,0.25)">
                  <SvgCircle cx="12" cy="5" r="1.5" />
                  <SvgCircle cx="12" cy="12" r="1.5" />
                  <SvgCircle cx="12" cy="19" r="1.5" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      {userId && (
        <View style={{ zIndex: 10, position: 'relative' }}>
          {/* Mention dropdown for comments — floats above input */}
          {mentionQuery !== null && mentionResults.length > 0 && (
            <View style={s.mentionDropdown}>
              {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFill}
              />
              <ScrollView
                style={{ maxHeight: 220 }}
                showsVerticalScrollIndicator={mentionResults.length > 5}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {mentionResults.map((u, idx) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[s.mentionItem, idx === mentionResults.length - 1 && { borderBottomWidth: 0 }]}
                    activeOpacity={0.7}
                    onPress={() => selectMention(u)}
                  >
                    <UserAvatar name={u.name} avatarUrl={u.avatar_url} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.mentionName}>{u.name}</Text>
                      <Text style={s.mentionHandle}>@{u.name.split(' ')[0].toLowerCase()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={s.commentInputRow}>
            <TextInput
              value={text}
              onChangeText={handleTextChange}
              placeholder="Escreva um comentário..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={s.commentInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim()}
              style={[s.sendBtn, !text.trim() && { opacity: 0.3 }]}
            >
              <SendIcon size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Compose Post ────────────────────────────────────────────────

function ComposeBox({ userId, userName, userAvatar }: { userId: string | null; userName: string; userAvatar?: string | null }) {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const { createPost, isPosting } = useCommunityStore();

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [mentions, setMentions] = useState<{ userId: string; name: string; avatar_url?: string | null }[]>([]);
  const mentionCacheRef = useRef<{ id: string; name: string; avatar_url: string | null }[]>([]);

  const fetchPartners = useCallback(async (query: string) => {
    if (!userId) return;
    // Use cached friends if available, otherwise fetch
    if (mentionCacheRef.current.length === 0) {
      const { data } = await supabase.rpc('get_friends', {
        p_user_id: userId,
        p_viewer_id: userId,
      });
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
    setMentionResults(filtered);
  }, [userId]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);

    // Detect @ mention - look for the last @ that isn't completed
    const lastAtIndex = newText.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const afterAt = newText.substring(lastAtIndex + 1);
      // Mention is active if no space after @ and reasonable length
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
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex < 0) return;
    const firstName = user.name.split(' ')[0];
    const newText = text.substring(0, lastAtIndex) + `@${firstName} `;
    setText(newText);
    setMentions((prev) => prev.some(m => m.userId === user.id) ? prev : [...prev, { userId: user.id, name: user.name, avatar_url: user.avatar_url }]);
    setMentionQuery(null);
    setMentionResults([]);
  }, [text]);

  const handlePickImage = async () => {
    if (!ImagePicker) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if ((!text.trim() && !imageUri) || !userId) return;
    const msg = text.trim();
    const mentionData = mentions.length > 0
      ? mentions.map((m) => ({ userId: m.userId, name: m.name, avatar_url: m.avatar_url ?? null }))
      : undefined;
    setText('');
    setMentions([]);
    const uri = imageUri;
    setImageUri(null);
    const success = await createPost(
      userId,
      uri ? 'photo' : 'text',
      msg || undefined,
      mentionData ? { mentions: mentionData } : {},
      uri ?? undefined,
    );
    if (!success) {
      setText(msg);
      setImageUri(uri);
      Alert.alert('Erro', 'Nao foi possivel publicar. Tente novamente.');
    }
  };

  if (!userId) return null;

  const canPost = text.trim() || imageUri;

  return (
    <View style={{ zIndex: 10, position: 'relative' }}>
      {/* Mention dropdown — positioned absolute above the compose card */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <View style={s.mentionDropdown}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={mentionResults.length > 5}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {mentionResults.map((u, idx) => (
              <TouchableOpacity
                key={u.id}
                style={[s.mentionItem, idx === mentionResults.length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={() => selectMention(u)}
              >
                <UserAvatar name={u.name} avatarUrl={u.avatar_url} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={s.mentionName}>{u.name}</Text>
                  <Text style={s.mentionHandle}>@{u.name.split(' ')[0].toLowerCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.composeCard}>
        {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Specular */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.composeSpecular}
        />

      {/* Image preview */}
      {imageUri && (
        <View style={s.composeImagePreview}>
          <Image source={{ uri: imageUri }} style={s.composePreviewImg} resizeMode="cover" />
          <TouchableOpacity
            style={s.composeImageRemove}
            onPress={() => setImageUri(null)}
          >
            <CloseIcon size={12} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.composeRow}>
        <UserAvatar name={userName} avatarUrl={userAvatar} size={34} />
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder={imageUri ? 'Adicione uma legenda...' : 'Compartilhe com a comunidade...'}
          placeholderTextColor="rgba(255,255,255,0.25)"
          style={s.composeInput}
          multiline
          maxLength={500}
          editable={!isPosting}
        />
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={isPosting}
          style={[s.composePhotoBtn, isPosting && { opacity: 0.3 }]}
        >
          <ImageIcon size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost || isPosting}
          style={[s.composeSend, (!canPost || isPosting) && { opacity: 0.3 }]}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#FF6C24" />
          ) : (
            <SendIcon size={16} />
          )}
        </TouchableOpacity>
      </View>
    </View>
    </View>
  );
}

// ─── Filter Tabs ─────────────────────────────────────────────────

function FilterTabs({ active, onChange }: { active: FeedFilter; onChange: (f: FeedFilter) => void }) {
  const tabs: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'conquistas', label: 'Conquistas' },
    { key: 'fotos', label: 'Fotos' },
    { key: 'desafios', label: 'Desafios' },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(500)} style={s.filterRow}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
            style={[s.filterTab, isActive && s.filterTabActive]}
          >
            {isActive && (
              <LinearGradient
                colors={['rgba(255,108,36,0.2)', 'rgba(255,108,36,0.08)']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[s.filterText, isActive && s.filterTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

// ─── Community Stats Banner ──────────────────────────────────────
// Backend: aggregate from community_posts + profiles

function CommunityStatsBanner({ posts }: { posts: CommunityPost[] }) {
  const uniqueUsers = new Set(posts.map((p) => p.user_id)).size;
  const totalEnergia = posts.reduce((sum, p) => sum + p.energia_count, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comment_count, 0);

  return (
    <Animated.View entering={FadeInDown.delay(50).duration(500)} style={s.statsRow}>
      {[
        { value: uniqueUsers, label: 'Membros', lottie: null, icon: <UsersIcon size={20} /> },
        { value: totalEnergia, label: 'Curtidas', lottie: null, icon: <EnergiaIcon size={20} active /> },
        { value: totalComments, label: 'Conversas', lottie: null, icon: <CommentIcon size={20} /> },
      ].map((stat, i) => (
        <View key={stat.label} style={[s.statCard, webGlass]}>
          {!isWeb && <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient
            colors={i === 1 ? ['rgba(255,108,36,0.12)', 'rgba(255,108,36,0.04)'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', i === 1 ? 'rgba(255,180,130,0.08)' : 'rgba(255,255,255,0.06)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.statSpecular}
          />
          <View style={s.statIconWrap}>{stat.icon}</View>
          <Text style={[s.statValue, i === 1 && { color: '#FF8540' }]}>{stat.value}</Text>
          <Text style={s.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={s.emptyContainer}>
      <View style={s.emptyLottie}>
        <LottieView source={AWARD_ANIM} autoPlay loop speed={0.6} style={{ width: 80, height: 80 }} />
      </View>
      <Text style={s.emptyTitle}>A comunidade começa com você</Text>
      <Text style={s.emptyDesc}>
        Complete aulas, conquiste módulos e compartilhe sua jornada com outros membros VITTA UP.
      </Text>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function ComunidadeScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useScrollY();
  const router = useRouter();
  const { user, session } = useAuthStore();
  const { posts, topMembers, isLoading, feedFilter, setFeedFilter, fetchPosts, loadMorePosts, toggleEnergia, deletePost, fetchTopMembers } = useCommunityStore();
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // filter state is now managed in communityStore (feedFilter + setFeedFilter)
  const filter = feedFilter;
  const setFilter = useCallback((f: FeedFilter) => {
    setFeedFilter(f);
  }, [setFeedFilter]);

  const { profile } = useUserStore();
  const userId = user?.id ?? null;

  const handleUserPress = useCallback((targetUserId: string) => {
    if (targetUserId === session?.user?.id) {
      router.push('/(tabs)/perfil' as any);
    } else {
      router.push(`/user/${targetUserId}` as any);
    }
  }, [session?.user?.id, router]);
  const userName = profile?.name ?? user?.user_metadata?.name ?? 'Usuário';
  const userAvatar = profile?.avatar_url ?? null;

  // Server-side filtering: posts are already filtered by the RPC
  // Keep client-side matchesFilter as fallback for legacy queries
  const filteredPosts = posts;

  useEffect(() => {
    fetchPosts();
    fetchTopMembers();
  }, []);

  // Re-fetch when filter changes (server-side filtering)
  useEffect(() => {
    fetchPosts(true);
  }, [feedFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(true), fetchTopMembers()]);
    setRefreshing(false);
  }, []);

  const handleEnergia = useCallback(
    (postId: string) => {
      if (!userId) return;
      toggleEnergia(postId, userId);
    },
    [userId, toggleEnergia],
  );

  const handleDelete = useCallback(
    (postId: string) => {
      if (!userId) return;
      Alert.alert(
        'Excluir post',
        'Tem certeza que deseja excluir este post? Essa ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => deletePost(postId, userId),
          },
        ],
      );
    },
    [userId, deletePost],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const isCloseToBottom = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6C24" progressBackgroundColor="#1A1008" />
        }
        onMomentumScrollEnd={(e) => {
          if (isCloseToBottom(e)) loadMorePosts();
        }}
      >
        {/* ══ HEADER ══ */}
        <Animated.View entering={FadeInDown.duration(500)} style={s.header}>
          <View>
            <Logo variant="gradient" size="sm" />
            <Text style={s.subtitle}>Comunidade</Text>
          </View>
          <TouchableOpacity
            style={s.searchBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/social/search' as any)}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <SvgCircle cx="11" cy="11" r="8" />
              <Path d="m21 21-4.3-4.3" />
            </Svg>
          </TouchableOpacity>
        </Animated.View>

        {/* ══ STATS BANNER ══ */}
        {posts.length > 0 && <CommunityStatsBanner posts={posts} />}

        {/* ══ TOP MEMBERS ══ */}
        {topMembers.length > 0 && <TopMembersSection members={topMembers} onMemberPress={handleUserPress} />}

        {/* ══ COMPOSE ══ */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <ComposeBox userId={userId} userName={userName} userAvatar={userAvatar} />
        </Animated.View>

        {/* ══ FILTER TABS ══ */}
        {posts.length > 0 && <FilterTabs active={filter} onChange={setFilter} />}

        {/* ══ FEED ══ */}
        {isLoading && posts.length === 0 ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6C24" />
            <Text style={s.loadingText}>Carregando feed...</Text>
          </View>
        ) : filteredPosts.length === 0 && posts.length === 0 ? (
          <EmptyFeed />
        ) : filteredPosts.length === 0 ? (
          <View style={s.emptyFilter}>
            <Text style={s.emptyFilterText}>Nenhum post nesta categoria ainda.</Text>
          </View>
        ) : (
          <>
            {/* Feed label */}
            <View style={s.feedLabel}>
              <View style={s.feedLabelLine} />
              <Text style={s.feedLabelText}>Atividade recente</Text>
              <View style={s.feedLabelLine} />
            </View>

            {filteredPosts.map((post, i) => (
              <React.Fragment key={post.id}>
                <PostCard
                  post={post}
                  userId={userId}
                  onToggleEnergia={handleEnergia}
                  onOpenComments={(id) => setActiveComments(activeComments === id ? null : id)}
                  onDelete={handleDelete}
                  onUserPress={handleUserPress}
                  index={i}
                />
                {activeComments === post.id && (
                  <CommentsSection postId={post.id} userId={userId} onClose={() => setActiveComments(null)} />
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  subtitle: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: FONTS.playfair.semibold, color: '#fff', fontSize: 20 },
  sectionSub: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.2)', fontSize: 11 },

  // Avatar
  avatar: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: FONTS.montserrat.bold, color: '#fff' },

  // Stats Banner
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24,
  },
  statSpecular: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, zIndex: 1 },
  statIconWrap: { marginBottom: 6, zIndex: 2 },
  statValue: { fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 16, zIndex: 2 },
  statLabel: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, zIndex: 2 },

  // Top Members
  topScroll: { paddingRight: 20, gap: 10, marginBottom: 24 },
  topCard: {
    width: 90, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16,
  },
  topSpecular: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, zIndex: 1 },
  topName: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 11, marginTop: 8, zIndex: 2 },
  topKm: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2, zIndex: 2 },
  topStatRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, zIndex: 2 },
  topStatValue: { fontFamily: FONTS.montserrat.bold, color: '#FF8540', fontSize: 11 },
  rankBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2, zIndex: 3,
  },
  rankBadgeFirst: { backgroundColor: 'rgba(255,108,36,0.25)' },
  rankText: { fontFamily: FONTS.montserrat.bold, color: 'rgba(255,255,255,0.4)', fontSize: 9 },
  rankTextFirst: { color: '#FF6C24' },

  // Compose
  composeCard: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16,
  },
  composeSpecular: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, zIndex: 1 },
  composeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, zIndex: 2 },
  composeInput: { flex: 1, fontFamily: FONTS.montserrat.regular, color: '#fff', fontSize: 13, maxHeight: 80, paddingVertical: 0 },
  composeSend: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,108,36,0.12)', justifyContent: 'center', alignItems: 'center',
  },

  // Filter Tabs
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  filterTabActive: { borderColor: 'rgba(255,108,36,0.25)' },
  filterText: { fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  filterTextActive: { color: '#FF8540' },

  // Feed label
  feedLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  feedLabelLine: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)' },
  feedLabelText: { fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: 1 },

  // Post Card
  postCard: {
    borderRadius: 18, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24,
  },
  postSpecular: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, zIndex: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, zIndex: 2 },
  postHeaderText: { flex: 1 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postUserName: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 13 },
  postTypeBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,108,36,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  postTypeBadgeBig: { backgroundColor: 'rgba(255,108,36,0.2)' },
  postTime: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 1 },

  // Achievement Card
  achieveCard: {
    marginHorizontal: 14, marginTop: 6, marginBottom: 4, borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,140,100,0.2)',
  },
  achieveSpecular: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, zIndex: 1 },
  achieveInnerBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,160,110,0.15)', zIndex: 1,
  },
  achieveContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, zIndex: 2 },
  achieveLottie: { width: 48, height: 48 },
  achieveTextArea: { flex: 1 },
  achieveLabel: {
    fontFamily: FONTS.montserrat.bold, color: '#FF8540', fontSize: 9,
    letterSpacing: 1.5, marginBottom: 3,
  },
  achieveTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 14 },

  // Post Body
  postBody: { paddingHorizontal: 16, paddingVertical: 8, zIndex: 2 },
  postText: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19 },
  postTextBold: { fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.9)' },

  // Context card
  contextCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.1)', overflow: 'hidden',
  },
  contextIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,108,36,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  contextText: { flex: 1 },
  contextTitle: { fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  contextSub: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 },

  // Challenge Join Card
  challengeJoinCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)', overflow: 'hidden',
  },
  challengeJoinIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,108,36,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  challengeJoinText: { flex: 1 },
  challengeJoinTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 13 },
  challengeJoinMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  challengeJoinCount: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  challengeJoinBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(255,108,36,0.15)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.25)',
  },
  challengeJoinBadgeText: { fontFamily: FONTS.montserrat.semibold, color: '#FF8540', fontSize: 10 },

  // Actions
  postActions: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)', zIndex: 2,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, minHeight: 36 },
  actionInner: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  iconAbsolute: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  actionText: { fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  actionTextActive: { color: '#FF6C24' },

  // Comments Sheet
  commentsSheet: {
    borderRadius: 18, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)', marginBottom: 14, marginTop: -6, maxHeight: 380,
  },
  commentsHandle: {
    width: 32, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginTop: 10,
  },
  commentsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)', zIndex: 2,
  },
  commentsTitle: { fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 14 },
  commentsClose: { fontFamily: FONTS.montserrat.medium, color: '#FF8540', fontSize: 12 },
  commentsList: { paddingHorizontal: 16, paddingVertical: 8, maxHeight: 240, zIndex: 2 },
  loadMoreComments: { alignItems: 'center', paddingVertical: 10 },
  loadMoreText: { fontFamily: FONTS.montserrat.medium, color: '#FF8540', fontSize: 12 },
  commentsEmpty: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)',
    fontSize: 12, textAlign: 'center', paddingVertical: 24,
  },
  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  commentContent: { flex: 1 },
  commentMsg: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 17 },
  commentName: { fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.9)' },
  commentTime: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 3 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)', zIndex: 2,
  },
  commentInput: {
    flex: 1, fontFamily: FONTS.montserrat.regular, color: '#fff', fontSize: 12,
    maxHeight: 60, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,108,36,0.12)', justifyContent: 'center', alignItems: 'center',
  },

  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12 },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyLottie: { width: 80, height: 80, marginBottom: 16 },
  emptyTitle: { fontFamily: FONTS.playfair.semibold, color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Empty filter
  emptyFilter: { alignItems: 'center', paddingVertical: 40 },
  emptyFilterText: { fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)', fontSize: 13 },

  // Delete button
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // Post image
  postImageWrap: {
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  postImage: {
    width: '100%', aspectRatio: 4 / 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // Compose photo
  composePhotoBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  composeImagePreview: {
    margin: 12, marginBottom: 0,
    borderRadius: 12, overflow: 'hidden',
    position: 'relative',
  },
  composePreviewImg: {
    width: '100%', height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  composeImageRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Mention dropdown
  mentionDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    zIndex: 100,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  } as any,
  mentionName: {
    fontFamily: FONTS.montserrat.semibold,
    color: '#fff',
    fontSize: 14,
  },
  mentionHandle: {
    fontFamily: FONTS.montserrat.regular,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 1,
  },
});

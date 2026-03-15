import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polyline, Rect } from 'react-native-svg';
import Animated, { FadeOut, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../src/stores/authStore';
import { useSocialStore, type FollowRequestItem } from '../../src/stores/socialStore';

// ── Icons ──

function ChevronBackIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function UserCheckIcon({ size = 56, color = 'rgba(255,255,255,0.12)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Polyline points="16 11 18 13 22 9" />
    </Svg>
  );
}

// ── Avatar Colors ──

const AVATAR_COLORS: [string, string][] = [
  ['#FF6C24', '#FFAC7D'],
  ['#FF8540', '#FF6C24'],
  ['#FFAC7D', '#FF8540'],
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ── Time Ago Helper ──

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}sem`;
  return `${Math.floor(diffDay / 30)}m`;
}

// ── Request Card ──

function RequestCard({
  item,
  onAccept,
  onDecline,
}: {
  item: FollowRequestItem;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [isProcessing, setIsProcessing] = useState<'accept' | 'decline' | null>(null);
  const colorIndex = (item.name ?? 'U').charCodeAt(0) % AVATAR_COLORS.length;
  const initial = getInitials(item.name ?? 'U');

  const handleAccept = () => {
    setIsProcessing('accept');
    onAccept(item.id);
  };

  const handleDecline = () => {
    setIsProcessing('decline');
    onDecline(item.id);
  };

  return (
    <Animated.View exiting={FadeOut.duration(250)} entering={FadeIn.duration(200)}>
      <TouchableOpacity
        style={styles.requestCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/user/${item.id}` as any)}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={AVATAR_COLORS[colorIndex]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarFallback}
            >
              <Text style={styles.avatarInitial}>{initial}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Name + subtitle */}
        <View style={styles.infoCol}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>quer te apoiar</Text>
            <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            activeOpacity={0.8}
            onPress={handleAccept}
            disabled={isProcessing !== null}
          >
            {isProcessing === 'accept' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.acceptBtnText}>Aceitar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            activeOpacity={0.8}
            onPress={handleDecline}
            disabled={isProcessing !== null}
          >
            {isProcessing === 'decline' ? (
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
            ) : (
              <Text style={styles.declineBtnText}>Recusar</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Screen ──

export default function FollowRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const {
    followRequests,
    followRequestsCount,
    fetchFollowRequests,
    acceptRequest,
    declineRequest,
  } = useSocialStore();

  const myId = session?.user?.id ?? '';

  useEffect(() => {
    if (myId) {
      fetchFollowRequests(myId);
    }
  }, [myId]);

  const handleAccept = useCallback(async (requesterId: string) => {
    const isMutual = await acceptRequest(myId, requesterId);
    if (isMutual) {
      Alert.alert('Novo parceiro!', 'Voces agora se apoiam mutuamente.');
    }
  }, [myId, acceptRequest]);

  const handleDecline = useCallback(async (requesterId: string) => {
    await declineRequest(myId, requesterId);
  }, [myId, declineRequest]);

  const renderItem = useCallback(({ item }: { item: FollowRequestItem }) => (
    <RequestCard
      item={item}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  ), [handleAccept, handleDecline]);

  const keyExtractor = useCallback((item: FollowRequestItem) => item.id, []);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronBackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Solicitacoes de apoio</Text>
          {followRequestsCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{followRequestsCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* List */}
      <FlatList
        data={followRequests}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <UserCheckIcon />
            <Text style={styles.emptyText}>Nenhuma solicitacao pendente</Text>
            <Text style={styles.emptySubtext}>
              Quando alguem quiser te apoiar, aparecera aqui
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 17,
    color: '#fff',
    textAlign: 'center',
  },
  countBadge: {
    backgroundColor: 'rgba(255,108,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.25)',
  },
  countText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#FF8540',
  },
  headerSpacer: { width: 40 },

  // Request Card
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  infoCol: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  userName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
  },
  timeAgo: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    height: 32,
    paddingHorizontal: 16,
    backgroundColor: '#FF6C24',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  acceptBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#fff',
  },
  declineBtn: {
    height: 32,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 68,
  },
  declineBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
  },

  // Empty / Loading
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
});

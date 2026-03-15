import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { useAuthStore } from '../../src/stores/authStore';
import { useSocialStore, type UserListItem } from '../../src/stores/socialStore';

// ── Icons ──

function ChevronBackIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function UsersIcon({ size = 56, color = 'rgba(255,255,255,0.12)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

// ── User Card ──

const PAGE_SIZE = 20;

function UserCard({ item }: { item: UserListItem }) {
  const initial = (item.name ?? 'U').charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={styles.userCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/user/${item.id}` as any)}
    >
      <View style={styles.avatarWrap}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
        {item.bio ? (
          <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
        ) : (
          <Text style={styles.userFollowers}>{item.followers_count} apoiadores</Text>
        )}
      </View>

      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="9 18 15 12 9 6" />
      </Svg>
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName?: string }>();
  const { session } = useAuthStore();
  const { following, isLoadingList, fetchFollowing } = useSocialStore();
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  const myId = session?.user?.id ?? '';
  const targetId = userId ?? myId;
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!targetId || !myId) return;
    offsetRef.current = 0;
    hasMoreRef.current = true;
    useSocialStore.setState({ following: [] });
    setHasLoaded(false);
    fetchFollowing(targetId, myId, 0).then(() => setHasLoaded(true));
  }, [targetId, myId]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingList || !hasMoreRef.current) return;
    const nextOffset = offsetRef.current + PAGE_SIZE;
    const prevCount = following.length;
    fetchFollowing(targetId, myId, nextOffset).then(() => {
      const newCount = useSocialStore.getState().following.length;
      if (newCount === prevCount) {
        hasMoreRef.current = false;
      } else {
        offsetRef.current = nextOffset;
      }
    });
  }, [isLoadingList, targetId, myId, following.length]);

  const renderItem = useCallback(({ item }: { item: UserListItem }) => (
    <UserCard item={item} />
  ), []);

  const keyExtractor = useCallback((item: UserListItem) => item.id, []);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronBackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Apoiando</Text>
          {following.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{following.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* List */}
      <FlatList
        data={following}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !hasLoaded || isLoadingList ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#FF6C24" size="large" />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <UsersIcon />
              <Text style={styles.emptyText}>Nao apoia ninguem ainda</Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingList && following.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#FF6C24" size="small" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  screen: { flex: 1 },

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

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarWrap: { marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#fff',
    zIndex: 1,
  },
  userInfo: { flex: 1, marginRight: 12 },
  userName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  userBio: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  userFollowers: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

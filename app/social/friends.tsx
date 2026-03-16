import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { useAuthStore } from '../../src/stores/authStore';
import { type UserListItem } from '../../src/stores/socialStore';
import { supabase } from '../../src/lib/supabase';

// ── Icons ──

function ChevronBackIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function HeartHandshakeIcon({ size = 56, color = 'rgba(255,255,255,0.12)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <Path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
      <Path d="m18 15-2-2" />
      <Path d="m15 18-2-2" />
    </Svg>
  );
}

// ── User Card ──

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

      {/* Mutual badge */}
      <View style={styles.mutualBadge}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FF8540" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <Circle cx="9" cy="7" r="4" />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName?: string }>();
  const { session } = useAuthStore();

  const myId = session?.user?.id ?? '';
  const targetId = userId ?? myId;

  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId || !myId) return;
    setItems([]);
    setLoading(true);
    supabase.rpc('get_friends', { p_user_id: targetId, p_viewer_id: myId, p_limit: 50, p_offset: 0 })
      .then(({ data, error }) => {
        if (!error && data) {
          setItems((data as any[]).map((r: any) => ({
            id: r.id, name: r.name ?? 'Usuário', avatar_url: r.avatar_url,
            bio: r.bio, is_private: r.is_private ?? false, followers_count: r.followers_count ?? 0,
          })));
        }
        setLoading(false);
      });
  }, [targetId, myId]);

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
          <Text style={styles.headerTitle}>Parceiros</Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#FF6C24" size="large" />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <HeartHandshakeIcon />
              <Text style={styles.emptyText}>Nenhum parceiro ainda</Text>
              <Text style={styles.emptySubtext}>Apoie pessoas para se conectar</Text>
            </View>
          )
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
  mutualBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,108,36,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.2)',
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
  emptySubtext: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.18)',
    marginTop: 6,
  },
});

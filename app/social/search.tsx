import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import { useAuthStore } from '../../src/stores/authStore';
import { useSocialStore, type UserListItem } from '../../src/stores/socialStore';
import { VerifiedBadge } from '../../src/components/VerifiedBadge';
import { supabase } from '../../src/lib/supabase';

// ── Icons ──

function ChevronBackIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function SearchIcon({ size = 18, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

function CloseIcon({ size = 16, color = 'rgba(255,255,255,0.4)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

function SearchBigIcon({ size = 56, color = 'rgba(255,255,255,0.12)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

// ── User Card (with follow button for search) ──

function UserCard({ item, myId, followingSet }: { item: UserListItem; myId: string; followingSet: Set<string> }) {
  const initial = (item.name ?? 'U').charAt(0).toUpperCase();
  const isMe = item.id === myId;
  const { followUser, unfollowUser, isFollowLoading } = useSocialStore();
  const [isFollowing, setIsFollowing] = useState(followingSet.has(item.id));
  const loading = isFollowLoading[item.id] ?? false;

  // Sync with parent's batch-fetched data
  useEffect(() => {
    setIsFollowing(followingSet.has(item.id));
  }, [followingSet, item.id]);

  const handleFollow = useCallback(async () => {
    if (loading) return;
    if (isFollowing) {
      setIsFollowing(false);
      await unfollowUser(myId, item.id);
    } else {
      setIsFollowing(true);
      const result = await followUser(myId, item.id);
      if (result === 'error') setIsFollowing(false);
    }
  }, [isFollowing, loading, myId, item.id]);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          {item.is_verified && <VerifiedBadge size={14} />}
        </View>
        {item.bio ? (
          <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
        ) : (
          <Text style={styles.userFollowers}>{item.followers_count} apoiadores</Text>
        )}
      </View>

      {!isMe && (
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followBtnActive]}
          activeOpacity={0.7}
          onPress={handleFollow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isFollowing ? '#FF8540' : '#fff'} size="small" />
          ) : (
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'Apoiando' : 'Apoiar'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { searchResults, isLoadingSearch, searchUsers } = useSocialStore();
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const myId = session?.user?.id ?? '';
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  // Batch fetch follow status when results change
  useEffect(() => {
    if (!myId || searchResults.length === 0) { setFollowingSet(new Set()); return; }
    const ids = searchResults.map(u => u.id).filter(id => id !== myId);
    if (ids.length === 0) return;
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', myId)
      .in('following_id', ids)
      .then(({ data }) => {
        setFollowingSet(new Set((data || []).map((d: any) => d.following_id)));
      });
  }, [searchResults, myId]);

  // Auto-focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Cleanup search results on unmount
  useEffect(() => {
    return () => {
      useSocialStore.setState({ searchResults: [] });
    };
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      useSocialStore.setState({ searchResults: [], isLoadingSearch: false });
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(text, myId);
    }, 400);
  }, [myId]);

  const handleClear = useCallback(() => {
    setQuery('');
    useSocialStore.setState({ searchResults: [], isLoadingSearch: false });
    inputRef.current?.focus();
  }, []);

  const renderItem = useCallback(({ item }: { item: UserListItem }) => (
    <UserCard item={item} myId={myId} followingSet={followingSet} />
  ), [myId, followingSet]);

  const keyExtractor = useCallback((item: UserListItem) => item.id, []);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const showNoResults = hasQuery && !isLoadingSearch && searchResults.length === 0;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronBackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar Parceiros</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <View style={styles.searchInput}>
          <SearchIcon />
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={query}
            onChangeText={handleChangeText}
            placeholder="Buscar por nome..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {hasQuery && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <CloseIcon />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={hasQuery ? searchResults : []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          isLoadingSearch ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#FF6C24" size="large" />
            </View>
          ) : showNoResults ? (
            <View style={styles.emptyWrap}>
              <SearchBigIcon />
              <Text style={styles.emptyText}>Nenhum resultado para '{trimmedQuery}'</Text>
            </View>
          ) : !hasQuery ? (
            <View style={styles.emptyWrap}>
              <SearchBigIcon />
              <Text style={styles.emptyText}>Encontre parceiros no VITTA UP</Text>
              <Text style={styles.emptySubtext}>Busque pelo nome de usuario</Text>
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
  headerTitle: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 17,
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },

  // Search
  searchWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    color: '#fff',
    height: 48,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  clearBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User Card
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

  // Follow Button
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF6C24',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,108,36,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.3)',
  },
  followBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#fff',
  },
  followBtnTextActive: {
    color: '#FF8540',
  },

  // Empty / Loading
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptySubtext: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.18)',
    marginTop: 6,
  },
});

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { FollowButton } from './FollowButton';
import type { UserListItem } from '../stores/socialStore';

// ── Types ──

interface RelationshipStatus {
  i_follow: boolean;
  they_follow: boolean;
  is_mutual: boolean;
  is_blocked: boolean;
  i_requested: boolean;
  they_requested: boolean;
}

interface UserCardProps {
  user: UserListItem;
  relationship?: RelationshipStatus;
  onPress: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  isFollowLoading?: boolean;
  showFollowButton?: boolean;
}

// ── Avatar Colors (same pattern as comunidade.tsx) ──

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

// ── Lock Icon ──

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

// ── Avatar (matches comunidade.tsx UserAvatar) ──

function UserAvatar({ name, avatarUrl, size = 48 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;

  if (avatarUrl) {
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={AVATAR_COLORS[colorIndex]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>{getInitials(name)}</Text>
    </LinearGradient>
  );
}

// ── Component ──

export function UserCard({
  user,
  relationship,
  onPress,
  onFollow,
  onUnfollow,
  isFollowLoading = false,
  showFollowButton = true,
}: UserCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Avatar */}
      <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={48} />

      {/* Name + Bio */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          {user.is_private && <LockIcon size={12} />}
        </View>
        {user.bio ? (
          <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>
        ) : null}
      </View>

      {/* Follow Button */}
      {showFollowButton && relationship && onFollow && onUnfollow && (
        <FollowButton
          relationship={relationship}
          isLoading={isFollowLoading}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          size="small"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    fontSize: 15,
    flexShrink: 1,
  },
  bio: {
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255,255,255,0.50)',
    fontSize: 12,
  },
});

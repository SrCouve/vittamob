import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { VerifiedBadge } from '../../../src/components/VerifiedBadge';
import { FONTS } from '../../../src/constants/theme';
import { useEventStore, type EventParticipant } from '../../../src/stores/eventStore';
import { useAuthStore } from '../../../src/stores/authStore';

function ChevronBackIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function UserAvatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?')[0].toUpperCase();

  if (avatarUrl && !failed) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#FF6C24', '#FFAC7D']}
      style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[s.avatarText, { fontSize: size * 0.4 }]}>{initial}</Text>
    </LinearGradient>
  );
}

export default function ParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { event, isLoading, fetchEvent } = useEventStore();

  // Refetch to get fresh participants list
  useEffect(() => {
    if (id && userId) fetchEvent(id, userId);
  }, [id, userId]);

  const participants = event?.participants ?? [];

  const renderItem = ({ item }: { item: EventParticipant }) => (
    <TouchableOpacity
      style={s.row}
      activeOpacity={0.7}
      onPress={() => router.push(`/user/${item.user_id}`)}
    >
      <UserAvatar name={item.name} avatarUrl={item.avatar_url} size={42} />
      <View style={s.rowInfo}>
        <View style={s.rowNameRow}>
          <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
          {item.is_verified && <VerifiedBadge size={14} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0D0D', '#1A1008', '#0D0D0D']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronBackIcon />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Participantes confirmados</Text>
          <Text style={s.headerSub}>{event?.participant_count ?? 0} confirmados</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* List */}
      <FlatList
        data={participants}
        keyExtractor={(item) => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.empty}>
              <ActivityIndicator color="#FF6C24" />
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>Nenhum participante ainda</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 16,
    color: '#fff',
  },
  headerSub: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowInfo: {
    flex: 1,
  },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowName: {
    fontFamily: FONTS.montserrat.semibold,
    fontSize: 15,
    color: '#fff',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: FONTS.montserrat.bold,
    color: '#fff',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: FONTS.montserrat.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FONTS } from '../constants/theme';

const TROPHY_ANIM = require('../../assets/trophi.json');

interface Props {
  userId: string;
}

export function UserRankBadge({ userId }: Props) {
  const [rank, setRank] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('get_user_rank', { p_user_id: userId }).then(({ data }) => {
      if (typeof data === 'number') setRank(data);
    });
  }, [userId]);

  if (rank === 0) return null;

  // Font size adapts to number length
  const rankStr = `#${rank}`;
  const fontSize = rankStr.length <= 2 ? 14 : rankStr.length <= 3 ? 12 : rankStr.length <= 4 ? 11 : 10;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={s.trophyWrap}>
        <LottieView
          source={TROPHY_ANIM}
          autoPlay
          loop={false}
          speed={0.8}
          style={s.trophy}
        />
      </View>
      <View style={s.rankWrap}>
        <Text style={s.label}>Rank</Text>
        <Text style={[s.number, { fontSize }]}>{rankStr}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  trophyWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophy: {
    width: 30,
    height: 30,
  },
  rankWrap: {
    alignItems: 'center',
    minWidth: 28,
  },
  label: {
    fontFamily: FONTS.montserrat.medium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  number: {
    fontFamily: FONTS.montserrat.extrabold,
    color: '#FF6C24',
    includeFontPadding: false,
    marginTop: -1,
  },
});

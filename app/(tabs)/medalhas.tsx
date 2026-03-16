import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert,
  ScrollView, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useMedalStore, type RaceMedal } from '../../src/stores/medalStore';
import { supabase } from '../../src/lib/supabase';

let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

const isWeb = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}min`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatPace(avgSpeed: number): string {
  if (avgSpeed === 0) return '—';
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MedalhasScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ targetUserId?: string }>();
  const { user } = useAuthStore();
  const { medals, isLoading, fetchMedals, updatePhoto } = useMedalStore();
  const [selectedMedal, setSelectedMedal] = useState<RaceMedal | null>(null);

  // If targetUserId is passed, show that user's medals (readOnly)
  const userId = params.targetUserId ?? user?.id ?? null;
  const isOwner = !params.targetUserId || params.targetUserId === user?.id;

  useEffect(() => {
    if (userId) fetchMedals(userId);
  }, [userId]);

  const pickPhoto = async (medal: RaceMedal) => {
    if (!ImagePicker || !userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${userId}/medals/${medal.id}.${ext}`;

    try {
      // Verify session is still active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Sessão expirada', 'Faça login novamente.');
        return;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from('community-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (error) {
        console.error('Medal photo upload error:', JSON.stringify(error));
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('community-images')
        .getPublicUrl(fileName);

      await updatePhoto(medal.id, urlData.publicUrl);
      setSelectedMedal({ ...medal, user_photo_url: urlData.publicUrl });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar a foto.');
    }
  };

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Quadro de Medalhas</Text>
          <Text style={s.subtitle}>{medals.length} medalha{medals.length !== 1 ? 's' : ''}</Text>
        </View>
      </Animated.View>

      {/* Loading */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#FF6C24" />
        </View>
      ) : medals.length === 0 ? (
        <Animated.View entering={FadeIn.duration(500)} style={s.emptyWrap}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏅</Text>
          <Text style={s.emptyTitle}>Nenhuma medalha ainda</Text>
          <Text style={s.emptyDesc}>Complete provas oficiais para ganhar medalhas!</Text>
        </Animated.View>
      ) : (
        <View style={s.grid}>
          {medals.map((medal, i) => (
            <Animated.View key={medal.id} entering={FadeInDown.delay(100 + i * 100).duration(450)}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedMedal(medal)}
                style={s.medalCard}
              >
                {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
                <LinearGradient
                  colors={['rgba(255,108,36,0.10)', 'rgba(255,108,36,0.03)']}
                  style={StyleSheet.absoluteFill}
                />
                {/* Specular */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                  style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1 }}
                />
                {medal.medal_image_url ? (
                  <Image source={{ uri: medal.medal_image_url }} style={s.medalImg} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 50 }}>🏅</Text>
                )}
                <Text style={s.medalName} numberOfLines={2}>{medal.race_name}</Text>
                <Text style={s.medalDist}>{medal.distance_km.toFixed(1)} km</Text>
                <Text style={s.medalDate}>
                  {new Date(medal.race_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Medal Detail Modal */}
      <Modal visible={!!selectedMedal} animationType="fade" transparent statusBarTranslucent>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedMedal(null)} />
          {selectedMedal && (
            <Animated.View entering={FadeIn.duration(300)} style={s.modalCard}>
              {!isWeb && <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />}
              <LinearGradient
                colors={['rgba(255,108,36,0.12)', 'rgba(255,108,36,0.04)', 'rgba(0,0,0,0.3)']}
                style={StyleSheet.absoluteFill}
              />
              {/* Border */}
              <View style={[StyleSheet.absoluteFill, { borderRadius: 28, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.2)' }]} />

              {/* Medal */}
              <View style={s.modalMedalWrap}>
                {selectedMedal.medal_image_url ? (
                  <Image source={{ uri: selectedMedal.medal_image_url }} style={s.modalMedalImg} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 90 }}>🏅</Text>
                )}
              </View>

              {/* Info */}
              <Text style={s.modalName}>{selectedMedal.race_name}</Text>
              <Text style={s.modalDate}>
                {new Date(selectedMedal.race_date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              {selectedMedal.location && (
                <Text style={s.modalLocation}>📍 {selectedMedal.location}</Text>
              )}

              {/* Stats */}
              <View style={s.modalStats}>
                <View style={s.stat}>
                  <Text style={s.statValue}>{selectedMedal.distance_km.toFixed(2)}</Text>
                  <Text style={s.statLabel}>km</Text>
                </View>
                <View style={s.statDiv} />
                <View style={s.stat}>
                  <Text style={s.statValue}>{formatTime(selectedMedal.moving_time_seconds)}</Text>
                  <Text style={s.statLabel}>tempo</Text>
                </View>
                <View style={s.statDiv} />
                <View style={s.stat}>
                  <Text style={s.statValue}>{formatPace(selectedMedal.average_speed)}</Text>
                  <Text style={s.statLabel}>pace /km</Text>
                </View>
              </View>

              {/* Photo */}
              {selectedMedal.user_photo_url ? (
                isOwner ? (
                  <TouchableOpacity onPress={() => pickPhoto(selectedMedal)} activeOpacity={0.9} style={s.photoWrap}>
                    <Image source={{ uri: selectedMedal.user_photo_url }} style={s.photo} resizeMode="cover" />
                    <View style={s.photoOverlay}>
                      <Text style={s.photoOverlayText}>Trocar foto</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={s.photoWrap}>
                    <Image source={{ uri: selectedMedal.user_photo_url }} style={s.photo} resizeMode="cover" />
                  </View>
                )
              ) : isOwner ? (
                <TouchableOpacity onPress={() => pickPhoto(selectedMedal)} activeOpacity={0.8} style={s.addPhotoBtn}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <SvgCircle cx="12" cy="13" r="4" />
                  </Svg>
                  <Text style={s.addPhotoText}>Adicionar foto da corrida</Text>
                </TouchableOpacity>
              ) : null}

              {/* Close */}
              <TouchableOpacity onPress={() => setSelectedMedal(null)} style={s.closeBtn} activeOpacity={0.8}>
                <Text style={s.closeBtnText}>Fechar</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 22,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)',
    fontSize: 13, marginTop: 2,
  },

  loadingWrap: { alignItems: 'center', paddingVertical: 60 },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 18,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)',
    fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  medalCard: {
    width: (SW - 40 - 12) / 2,
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)',
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 14,
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20,
  },
  medalImg: {
    width: 90, height: 90, marginBottom: 14,
  },
  medalName: {
    fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 14,
    textAlign: 'center',
  },
  medalDist: {
    fontFamily: 'Montserrat_600SemiBold', color: '#FF6C24', fontSize: 13,
    marginTop: 4,
  },
  medalDate: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.25)',
    fontSize: 11, marginTop: 4, textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%', borderRadius: 28, overflow: 'hidden',
    alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24,
  },
  modalMedalWrap: {
    width: 130, height: 130, marginBottom: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  modalMedalImg: { width: 130, height: 130 },
  modalName: {
    fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 24,
    textAlign: 'center',
  },
  modalDate: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)',
    fontSize: 13, marginTop: 6, textAlign: 'center', textTransform: 'capitalize',
  },
  modalLocation: {
    fontFamily: 'Montserrat_500Medium', color: 'rgba(255,108,36,0.6)',
    fontSize: 13, marginTop: 6, textAlign: 'center',
  },
  modalStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    width: '100%', marginTop: 24, marginBottom: 24,
    paddingVertical: 18, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 20,
  },
  statLabel: {
    fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.35)',
    fontSize: 11, marginTop: 3,
  },
  statDiv: {
    width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoWrap: {
    width: '100%', height: 190, borderRadius: 18, overflow: 'hidden',
    marginBottom: 20,
  },
  photo: { width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 8, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  photoOverlayText: {
    fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, paddingHorizontal: 24,
    borderRadius: 16, borderWidth: 1, borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)', marginBottom: 20,
  },
  addPhotoText: {
    fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 14, paddingHorizontal: 36,
    borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  closeBtnText: {
    fontFamily: 'Montserrat_600SemiBold', color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

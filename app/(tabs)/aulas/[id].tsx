import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';

const isWeb = Platform.OS === 'web';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Polygon, Circle, Polyline } from 'react-native-svg';
import { GlassCard } from '../../../src/components/GlassCard';
import { FONTS } from '../../../src/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

function ArrowLeftIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m12 19-7-7 7-7" />
      <Path d="M19 12H5" />
    </Svg>
  );
}

function HeartIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Svg>
  );
}

function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Path d="m8.59 13.51 6.83 3.98" />
      <Path d="m15.41 6.51-6.82 3.98" />
    </Svg>
  );
}

function MessageIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </Svg>
  );
}

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m22 2-7 20-4-9-9-4Z" />
      <Path d="m22 2-11 11" />
    </Svg>
  );
}

function SmallHeartIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Svg>
  );
}

const lessonData = {
  id: '3',
  title: 'Saudação ao Sol',
  module: 'Yoga Matinal',
  description: 'Aprenda a sequência completa da Saudação ao Sol (Surya Namaskar). Uma prática milenar que aquece o corpo, alonga os músculos e conecta respiração com movimento.',
  duration: '22 min',
};

const comments = [
  { id: '1', author: 'Maria Silva', avatar: 'M', text: 'Adorei essa aula! Mudou minha rotina matinal completamente.', time: '2h atrás', likes: 8 },
  { id: '2', author: 'João Santos', avatar: 'J', text: 'Prática incrível, faço todo dia agora. Obrigado! 🙏', time: '5h atrás', likes: 12 },
  { id: '3', author: 'Ana Costa', avatar: 'A', text: 'No começo achei difícil mas com a prática ficou natural. Recomendo muito!', time: '1d atrás', likes: 5 },
  { id: '4', author: 'Pedro Lima', avatar: 'P', text: 'Melhor aula de yoga que já fiz online.', time: '2d atrás', likes: 15 },
];

export default function AulaDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [newComment, setNewComment] = useState('');

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Video player area with blurred preview */}
      <View style={styles.videoArea}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=450&fit=crop' }}
          style={styles.videoBlurBg}
          blurRadius={8}
        />
        <View style={styles.videoOverlay} />

        {/* Play button */}
        <TouchableOpacity style={[styles.playBtnLarge, isWeb ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any : {}]} activeOpacity={0.8}>
          {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="#fff">
            <Polygon points="5 3 19 12 5 21 5 3" />
          </Svg>
        </TouchableOpacity>

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { top: insets.top + 8 }, isWeb ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}]}
          activeOpacity={0.7}
        >
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          <ArrowLeftIcon />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title + Actions */}
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.moduleLabel}>{lessonData.module}</Text>
            <Text style={styles.lessonTitle}>{lessonData.title}</Text>
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <HeartIcon />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <ShareIcon />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.duration}>{lessonData.duration}</Text>
        <Text style={styles.description}>{lessonData.description}</Text>

        {/* Comments */}
        <View style={styles.commentsHeader}>
          <MessageIcon />
          <Text style={styles.commentsTitle}>Comentários</Text>
          <Text style={styles.commentsCount}>({comments.length})</Text>
        </View>

        {/* Comment input */}
        <View style={styles.commentInputRow}>
          <View style={styles.commentAvatar}>
            <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={styles.commentAvatarText}>K</Text>
          </View>
          <View style={styles.commentInputWrap}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escreva um comentário..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={newComment}
              onChangeText={setNewComment}
            />
            {newComment.trim().length > 0 && (
              <TouchableOpacity style={styles.sendBtn} onPress={() => setNewComment('')}>
                <SendIcon />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Comment list */}
        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentRow}>
            <View style={styles.commentUserAvatar}>
              <Text style={styles.commentUserInitial}>{comment.avatar}</Text>
            </View>
            <View style={styles.commentContent}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentTime}>{comment.time}</Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
              <View style={styles.commentActions}>
                <TouchableOpacity style={styles.commentActionBtn} activeOpacity={0.7}>
                  <SmallHeartIcon />
                  <Text style={styles.commentActionText}>{comment.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.commentActionBtn} activeOpacity={0.7}>
                  <Text style={styles.commentActionText}>Responder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: insets.bottom + 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },

  videoArea: { width: SCREEN_W, aspectRatio: 16 / 9, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212', overflow: 'hidden' },
  videoBlurBg: { position: 'absolute', width: '105%', height: '105%', opacity: 0.4 },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  playBtnLarge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,108,36,0.3)', paddingLeft: 3 },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

  content: { paddingHorizontal: 20, paddingTop: 20 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 4 },
  titleText: { flex: 1 },
  moduleLabel: { fontFamily: 'Montserrat_500Medium', color: '#FF8540', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  lessonTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 24, marginTop: 4 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },

  duration: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 },
  description: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, marginBottom: 32 },

  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  commentsTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', color: '#fff', fontSize: 18 },
  commentsCount: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 12 },

  commentInputRow: { flexDirection: 'row', gap: 12, marginBottom: 24, alignItems: 'flex-start' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 8 },
  commentAvatarText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 10, zIndex: 1 },
  commentInputWrap: { flex: 1, position: 'relative' },
  commentInput: { height: 48, paddingHorizontal: 16, paddingRight: 44, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, color: '#fff', fontFamily: 'Montserrat_400Regular', fontSize: 14 },
  sendBtn: { position: 'absolute', right: 12, top: 14 },

  commentRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
  commentUserAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  commentUserInitial: { fontFamily: 'Montserrat_700Bold', color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  commentContent: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 12 },
  commentTime: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.25)', fontSize: 12 },
  commentText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  commentActionText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});

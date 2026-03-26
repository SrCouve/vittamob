import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { router } from 'expo-router';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useCoachStore } from '../../src/stores/coachStore';

const isWeb = Platform.OS === 'web';
const LT_BRAIN = require('../../assets/coach/cyberpunk-character.json');
const THUNDER = require('../../assets/thunder-energia.json');

function ChevronBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13" />
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </Svg>
  );
}

export default function CoachChat() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const { messages, isGenerating, fetchMessages, sendMessage } = useCoachStore();
  const [text, setText] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const MAX_DAILY = 3;

  useEffect(() => {
    if (userId) fetchMessages(userId);
  }, [userId]);

  // Count today's messages
  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMsgs = messages.filter(m => m.role === 'user' && new Date(m.created_at) >= todayStart);
    setTodayCount(todayMsgs.length);
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !userId || isGenerating) return;
    const msg = text.trim();
    setText('');
    await sendMessage(userId, msg);
  }, [text, userId, isGenerating, sendMessage]);

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View entering={FadeInDown.duration(300)} style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.coachAvatar}>
            <LottieView source={require('../../assets/coach/presentation.json')} autoPlay loop speed={0.4} style={{ width: 35, height: 35 }} />
          </View>
        )}
        <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleCoach]}>
          {!isUser && !isWeb && <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />}
          <Text style={[s.msgText, isUser && s.msgTextUser]}>{item.content}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0D0D', '#1A1008', '#0D0D0D']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronBack />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <LottieView source={LT_BRAIN} autoPlay loop speed={0.5} style={{ width: 35, height: 35, marginRight: 8 }} />
          <Text style={s.headerTitle}>Coach VITTA</Text>
        </View>
        <View style={{ width: 20 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[s.messagesList, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <LottieView source={THUNDER} autoPlay loop speed={0.6} style={{ width: 50, height: 50 }} />
              <Text style={s.emptyChatTitle}>Fale com seu coach</Text>
              <Text style={s.emptyChatSub}>Pergunte sobre treino, lesão, nutrição, troca de dias, qualquer dúvida sobre corrida.</Text>
              <View style={s.suggestions}>
                {['Posso correr amanhã?', 'Tô com dor no joelho', 'Como melhorar meu pace?'].map((sug) => (
                  <TouchableOpacity key={sug} style={s.suggestionChip} activeOpacity={0.7} onPress={() => setText(sug)}>
                    <Text style={s.suggestionText}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* Typing indicator */}
        {isGenerating && (
          <Animated.View entering={FadeIn.duration(200)} style={s.typingRow}>
            <View style={s.coachAvatar}>
              <LottieView source={LT_BRAIN} autoPlay loop speed={0.4} style={{ width: 35, height: 35 }} />
            </View>
            <View style={s.typingDots}>
              <ActivityIndicator size="small" color="#FF6C24" />
              <Text style={s.typingText}>Pensando...</Text>
            </View>
          </Animated.View>
        )}

        {/* Input */}
        <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          {todayCount >= MAX_DAILY ? (
            <View style={s.limitReached}>
              <Text style={s.limitText}>Você usou suas {MAX_DAILY} mensagens de hoje</Text>
              <Text style={s.limitSub}>Amanhã tem mais. Foca no treino!</Text>
            </View>
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={s.input}
                  placeholder="Pergunte ao coach..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                />
                <Text style={s.charCount}>{MAX_DAILY - todayCount} restante{MAX_DAILY - todayCount !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity
                style={[s.sendBtn, (!text.trim() || isGenerating) && { opacity: 0.3 }]}
                activeOpacity={0.7}
                onPress={handleSend}
                disabled={!text.trim() || isGenerating}
              >
                <LinearGradient colors={['#FF6C24', '#FF8540']} style={StyleSheet.absoluteFill} />
                <LottieView source={require('../../assets/coach/presentation.json')} autoPlay loop={false} speed={0.8} style={{ width: 28, height: 28 }} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#fff' },

  messagesList: { paddingHorizontal: 16, paddingTop: 16 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },

  coachAvatar: { width: 35, height: 35, borderRadius: 14, backgroundColor: 'rgba(255,108,36,0.1)', alignItems: 'center', justifyContent: 'center' },

  msgBubble: { maxWidth: '78%', borderRadius: 18, padding: 12, overflow: 'hidden' },
  msgBubbleCoach: { backgroundColor: isWeb ? 'rgba(255,255,255,0.06)' : 'transparent', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 },
  msgBubbleUser: { backgroundColor: 'rgba(255,108,36,0.12)', borderBottomRightRadius: 4 },

  msgText: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  msgTextUser: { color: 'rgba(255,255,255,0.85)' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typingText: { fontFamily: FONTS.montserrat.medium, fontSize: 12, color: 'rgba(255,255,255,0.25)' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: isWeb ? 'rgba(13,13,13,0.95)' : 'transparent',
    overflow: 'hidden',
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: FONTS.montserrat.regular, fontSize: 14, color: '#fff',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },

  emptyChat: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyChatTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 18, color: '#fff', marginTop: 16 },
  emptyChatSub: { fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 18, marginTop: 8, marginBottom: 24 },
  suggestions: { gap: 8, width: '100%' },
  suggestionChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  suggestionText: { fontFamily: FONTS.montserrat.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // Rate limit
  limitReached: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  limitText: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  limitSub: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
  charCount: { fontFamily: FONTS.montserrat.regular, fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 4, marginLeft: 16 },
});

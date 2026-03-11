import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle, Polyline, Polygon, Line } from 'react-native-svg';
import { GlassCard } from '../../src/components/GlassCard';
import { FONTS } from '../../src/constants/theme';

function ArrowLeftIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m12 19-7-7 7-7" />
      <Path d="M19 12H5" />
    </Svg>
  );
}

function PlayIcon({ size = 14, color = '#FF6C24', fill = false }: { size?: number; color?: string; fill?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? '#fff' : 'none'} stroke={fill ? '#fff' : color} strokeWidth={2}>
      <Polygon points="5 3 19 12 5 21 5 3" />
    </Svg>
  );
}

function CheckCircleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

function ClockIcon({ size = 10 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round">
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function MessageIcon({ size = 10 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </Svg>
  );
}

const moduleData = {
  id: '1',
  title: 'Yoga Matinal',
  description: 'Desperte seu corpo todas as manhãs com práticas de yoga que energizam, alongam e preparam você para um dia incrível. Do iniciante ao avançado.',
  lessons: [
    { id: '1', title: 'Introdução ao Yoga', duration: '8 min', completed: true, comments: 12 },
    { id: '2', title: 'Respiração Pranayama', duration: '15 min', completed: true, comments: 24 },
    { id: '3', title: 'Saudação ao Sol', duration: '22 min', completed: false, comments: 18 },
    { id: '4', title: 'Posturas de Equilíbrio', duration: '25 min', completed: false, comments: 8 },
    { id: '5', title: 'Flexibilidade Profunda', duration: '30 min', completed: false, comments: 5 },
    { id: '6', title: 'Yoga Restaurativa', duration: '20 min', completed: false, comments: 15 },
    { id: '7', title: 'Flow Matinal Completo', duration: '35 min', completed: false, comments: 22 },
    { id: '8', title: 'Meditação Pós-Prática', duration: '10 min', completed: false, comments: 30 },
  ],
};

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const completedCount = moduleData.lessons.filter((l) => l.completed).length;
  const progress = Math.round((completedCount / moduleData.lessons.length) * 100);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={styles.backBtn}
      >
        <ArrowLeftIcon />
        <Text style={styles.backText}>Módulos</Text>
      </TouchableOpacity>

      {/* Title */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <Text style={styles.pageTitle}>{moduleData.title}</Text>
        <Text style={styles.pageDesc}>{moduleData.description}</Text>
      </Animated.View>

      {/* Progress card */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)}>
        <GlassCard variant="orange" style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{completedCount} de {moduleData.lessons.length} aulas</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={['#FF6C24', '#FFAC7D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
        </GlassCard>
      </Animated.View>

      {/* CTA Button */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6C24', '#FF8540']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.ctaContent}>
            <PlayIcon size={18} fill />
            <Text style={styles.ctaText}>
              {completedCount > 0 ? 'Continuar Assistindo' : 'Começar Módulo'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Lessons */}
      <Text style={styles.lessonsTitle}>Aulas</Text>
      {moduleData.lessons.map((lesson, index) => (
        <Animated.View key={lesson.id} entering={FadeInDown.delay(150 + index * 30).duration(500)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/aulas/${lesson.id}` as any)}
          >
            <GlassCard
              variant={lesson.completed ? 'light' : 'medium'}
              style={[styles.lessonCard, lesson.completed && { opacity: 0.7 }]}
            >
              <View style={styles.lessonRow}>
                <View style={[styles.lessonNum, lesson.completed && styles.lessonNumCompleted]}>
                  {lesson.completed ? (
                    <CheckCircleIcon size={20} />
                  ) : (
                    <Text style={styles.lessonNumText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.lessonText}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                  <View style={styles.lessonMeta}>
                    <View style={styles.lessonMetaItem}>
                      <ClockIcon />
                      <Text style={styles.lessonMetaText}>{lesson.duration}</Text>
                    </View>
                    <View style={styles.lessonMetaItem}>
                      <MessageIcon />
                      <Text style={styles.lessonMetaText}>{lesson.comments}</Text>
                    </View>
                  </View>
                </View>
                {!lesson.completed && (
                  <View style={styles.lessonPlayBtn}>
                    <PlayIcon size={14} color="#FF6C24" />
                  </View>
                )}
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginBottom: 24 },
  backText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 30, marginBottom: 8 },
  pageDesc: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22, marginBottom: 24 },

  progressCard: { padding: 20, marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  progressPercent: { fontFamily: 'Montserrat_700Bold', color: '#FF6C24', fontSize: 14 },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  ctaBtn: { height: 52, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 30 },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 15 },

  lessonsTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', color: '#fff', fontSize: 20, marginBottom: 16 },

  lessonCard: { padding: 16, marginBottom: 12 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lessonNum: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  lessonNumCompleted: { backgroundColor: 'rgba(255,108,36,0.2)', borderColor: 'transparent' },
  lessonNumText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  lessonText: { flex: 1 },
  lessonTitle: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 14 },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  lessonMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lessonMetaText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  lessonPlayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,108,36,0.2)', justifyContent: 'center', alignItems: 'center' },
});

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Polygon, Circle, Polyline } from 'react-native-svg';
import { GlassCard } from '../../../src/components/GlassCard';
import { FONTS } from '../../../src/constants/theme';

function PlayIcon({ size = 14, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={2}>
      <Polygon points="5 3 19 12 5 21 5 3" />
    </Svg>
  );
}

function ClockIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round">
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8" />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}

const categories = ['Todos', 'Yoga', 'Força', 'Meditação', 'Funcional', 'Nutrição'];

const allLessons = [
  { id: '1', title: 'Saudação ao Sol', module: 'Yoga Matinal', duration: '22 min', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400' },
  { id: '2', title: 'Respiração Pranayama', module: 'Yoga Matinal', duration: '15 min', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400' },
  { id: '3', title: 'HIIT Express', module: 'Treino Funcional', duration: '18 min', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
  { id: '4', title: 'Meditação da Manhã', module: 'Mindset', duration: '10 min', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400' },
  { id: '5', title: 'Treino de Força A', module: 'Força & Performance', duration: '35 min', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
  { id: '6', title: 'Smoothies Detox', module: 'Nutrição Inteligente', duration: '12 min', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400' },
  { id: '7', title: 'Pilates Core', module: 'Pilates', duration: '25 min', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
  { id: '8', title: 'Atenção Plena', module: 'Meditação Guiada', duration: '15 min', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400' },
];

export default function AulasScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = React.useState('Todos');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(500)}>
        <Text style={styles.pageTitle}>Aulas</Text>
        <Text style={styles.pageSubtitle}>Explore todas as aulas disponíveis</Text>
      </Animated.View>

      {/* Category filter */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryPill, isActive && styles.categoryPillActive]}>
                  {isActive && (
                    <LinearGradient
                      colors={['#FF6C24', '#FF8540']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Lesson list */}
      {allLessons.map((lesson, index) => (
        <Animated.View key={lesson.id} entering={FadeInDown.delay(100 + index * 30).duration(500)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/aulas/${lesson.id}` as any)}
            style={styles.lessonCard}
          >
            <GlassCard style={styles.lessonGlass}>
              <View style={styles.lessonRow}>
                <View style={styles.lessonPlayWrap}>
                  <PlayIcon size={16} color="#FF6C24" />
                </View>
                <View style={styles.lessonText}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                  <View style={styles.lessonMeta}>
                    <Text style={styles.lessonModule}>{lesson.module}</Text>
                    <View style={styles.lessonDuration}>
                      <ClockIcon size={10} />
                      <Text style={styles.lessonDurationText}>{lesson.duration}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.lessonPlayBtn}>
                  <PlayIcon size={12} color="#FF6C24" />
                </View>
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
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 30, marginBottom: 4 },
  pageSubtitle: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 },

  categoriesScroll: { gap: 8, paddingBottom: 20 },
  categoryPill: { height: 36, borderRadius: 18, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  categoryPillActive: { borderColor: 'rgba(255,108,36,0.3)' },
  categoryText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  categoryTextActive: { color: '#fff', fontFamily: 'Montserrat_600SemiBold' },

  lessonCard: { marginBottom: 10 },
  lessonGlass: { padding: 16 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  lessonPlayWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,108,36,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)', justifyContent: 'center', alignItems: 'center' },
  lessonText: { flex: 1 },
  lessonTitle: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 14 },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  lessonModule: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  lessonDuration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lessonDurationText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  lessonPlayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,108,36,0.2)', justifyContent: 'center', alignItems: 'center' },
});

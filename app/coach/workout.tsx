import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  Dimensions, Platform, Alert, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useCoachStore } from '../../src/stores/coachStore';
import type { DayPlan } from '../../src/lib/coach-prompt';

const { width: SW } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Icons
const LT_STOPWATCH = require('../../assets/coach/stopwatch.json');
const LT_HEARTBEAT = require('../../assets/coach/heartbeat.json');
const LT_MUSCLE = require('../../assets/coach/arm-muscle.json');
const LT_REST = require('../../assets/coach/sleep.json');
const LT_SPEED = require('../../assets/coach/stopwatch.json');
const LT_COACH = require('../../assets/coach/presentation.json');
const LT_TARGET = require('../../assets/coach/mission.json');

// ══════════════════════════════════════
// Config
// ══════════════════════════════════════

function getTypeLottie(type: string) {
  switch (type) {
    case 'interval': return LT_STOPWATCH;
    case 'easy': case 'recovery': return LT_HEARTBEAT;
    case 'long': return LT_MUSCLE;
    case 'descanso': return LT_REST;
    case 'tempo': case 'repetition': return LT_SPEED;
    default: return LT_HEARTBEAT;
  }
}

const TYPE_LABELS: Record<string, string> = {
  descanso: 'Descanso', easy: 'Corrida Leve', long: 'Longão',
  tempo: 'Tempo Run', interval: 'Intervalado', repetition: 'Repetição', recovery: 'Recuperação',
};

const TYPE_COLORS: Record<string, string> = {
  descanso: 'rgba(255,255,255,0.15)', easy: '#4CAF50', long: '#2196F3',
  tempo: '#FF9800', interval: '#FF6C24', repetition: '#E91E63', recovery: '#9C27B0',
};

const DAYS_DISPLAY: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
  quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
};

const RPE_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Muito fácil', color: '#4CAF50' },
  { value: 2, emoji: '😊', label: 'Fácil', color: '#8BC34A' },
  { value: 3, emoji: '🙂', label: 'Moderado', color: '#FFC107' },
  { value: 4, emoji: '😤', label: 'Difícil', color: '#FF9800' },
  { value: 5, emoji: '🥵', label: 'Muito difícil', color: '#FF5722' },
];

function hasContent(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ══════════════════════════════════════
// SVG Icons
// ══════════════════════════════════════

function ChevronBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ShareIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <Path d="M16 6l-4-4-4 4" />
      <Path d="M12 2v13" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}


function WatchIcon() {
  return <LottieView source={LT_WATCH} autoPlay loop speed={0.5} style={{ width: 35, height: 35 }} />;
}

// ══════════════════════════════════════
// Glass Card
// ══════════════════════════════════════

function GlassCard({ children, style, orangeTint, delay = 0 }: {
  children: React.ReactNode; style?: any; orangeTint?: boolean; delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify().damping(18)} style={[s.glassCard, style]}>
      {!isWeb && <BlurView intensity={35} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <LinearGradient
        colors={orangeTint
          ? ['rgba(255,108,36,0.08)', 'rgba(255,133,64,0.04)', 'rgba(255,108,36,0.06)']
          : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
      />
      <LinearGradient
        colors={['transparent', orangeTint ? 'rgba(255,180,130,0.08)' : 'rgba(255,255,255,0.04)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
      />
      <View style={s.glassCardInner}>{children}</View>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Stat Card
// ══════════════════════════════════════

function StatCard({ label, value, unit, color, delay }: { label: string; value: string; unit?: string; color?: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify().damping(16)} style={s.statCard}>
      {!isWeb && <BlurView intensity={12} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
      <View style={s.statCardInner}>
        <Text style={[s.statValue, color ? { color } : undefined]}>
          {value}
          {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
        </Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Interval Block Visual
// ══════════════════════════════════════

interface IntervalBlock { reps: number; distance: string; pace?: string; rest?: string; }

function parseIntervals(text: string): IntervalBlock[] | null {
  const regex = /(\d+)\s*[xX]\s*(\d+\s*(?:m|km|metros?|quilometros?))\s*(?:(?:em|@|a)\s*([^\s(,;]+(?:\/km)?))?/g;
  const blocks: IntervalBlock[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const block: IntervalBlock = { reps: parseInt(match[1], 10), distance: match[2].trim() };
    if (match[3]) block.pace = match[3].trim();
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 60);
    const recMatch = after.match(/(?:rec(?:uperacao)?|descanso|intervalo)\s*(?:de\s*)?(\d+\s*(?:s|seg|min|segundos?|minutos?|'))/i);
    if (recMatch) block.rest = recMatch[1].trim();
    blocks.push(block);
  }
  return blocks.length > 0 ? blocks : null;
}

function IntervalBlockView({ block }: { block: IntervalBlock }) {
  return (
    <View style={s.intervalBlock}>
      <View style={s.intervalRepBadge}>
        <Text style={s.intervalRepText}>{block.reps}x</Text>
      </View>
      <View style={s.intervalDetails}>
        <Text style={s.intervalDistance}>{block.distance}</Text>
        {block.pace ? <Text style={s.intervalPace}>@ {block.pace}</Text> : null}
      </View>
      {block.rest ? (
        <View style={s.intervalRestBadge}>
          <Text style={s.intervalRestText}>rec {block.rest}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ══════════════════════════════════════
// Step Card (Warmup / Main / Cooldown)
// ══════════════════════════════════════

const LT_TEMPERATURE = require('../../assets/coach/temperature.json');
const LT_TARGET_ANIM = require('../../assets/coach/target-anim.json');
const LT_COLD = require('../../assets/coach/cold.json');
const LT_SATISFACTION = require('../../assets/coach/customer-satisfaction.json');
const LT_WATCH = require('../../assets/sports-watch.json');

const STEP_LOTTIE: Record<string, { source: any; color: string }> = {
  warmup: { source: LT_TEMPERATURE, color: '#FFAC7D' },
  main: { source: LT_TARGET_ANIM, color: '#FF6C24' },
  cooldown: { source: LT_COLD, color: '#64B5F6' },
};

function StepCard({ step, text, delay, parseAsIntervals }: {
  step: 'warmup' | 'main' | 'cooldown'; text: string; delay: number; parseAsIntervals?: boolean;
}) {
  const { source, color } = STEP_LOTTIE[step];
  const title = step === 'warmup' ? 'Aquecimento' : step === 'main' ? 'Principal' : 'Desaquecimento';
  const intervals = useMemo(() => parseAsIntervals ? parseIntervals(text) : null, [text, parseAsIntervals]);

  return (
    <GlassCard delay={delay} style={{ marginBottom: 10 }}>
      <View style={s.stepHeader}>
        <LottieView source={source} autoPlay loop speed={0.6} style={{ width: 40, height: 40 }} />
        <Text style={[s.stepTitle, { color }]}>{title}</Text>
      </View>
      {intervals ? (
        <View style={{ gap: 6 }}>
          {intervals.map((b, i) => <IntervalBlockView key={i} block={b} />)}
          <Text style={[s.stepText, { marginTop: 8 }]}>{text}</Text>
        </View>
      ) : (
        <Text style={s.stepText}>{text}</Text>
      )}
    </GlassCard>
  );
}

// ══════════════════════════════════════
// RPE Modal
// ══════════════════════════════════════

function RPESelector({ onSelect, onCancel }: { onSelect: (rpe: number) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.rpeOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />
      <Animated.View entering={FadeInUp.delay(100).duration(400).springify().damping(16)} style={s.rpeSheet}>
        {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={['rgba(30,25,20,0.95)', 'rgba(20,17,14,0.98)']} style={StyleSheet.absoluteFill} />

        <View style={s.rpeHandle} />
        <Text style={s.rpeTitle}>Como foi o treino?</Text>
        <Text style={s.rpeSub}>Isso ajuda a ajustar seu próximo plano</Text>

        <View style={s.rpeOptions}>
          {RPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[s.rpeOption, selected === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}15` }]}
              activeOpacity={0.7}
              onPress={() => {
                setSelected(opt.value);
                if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={s.rpeEmoji}>{opt.emoji}</Text>
              <Text style={[s.rpeLabel, selected === opt.value && { color: opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.rpeConfirmBtn, !selected && { opacity: 0.3 }]}
          activeOpacity={0.85}
          disabled={!selected}
          onPress={() => selected && onSelect(selected)}
        >
          <LinearGradient colors={['#FF6C24', '#FF8540']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <CheckIcon />
          <Text style={s.rpeConfirmText}>Confirmar</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Main Screen
// ══════════════════════════════════════

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data: string }>();
  const [showRPE, setShowRPE] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const { weekLog, detectedRuns, confirmDetectedRun } = useCoachStore();

  const workout: DayPlan | null = useMemo(() => {
    try { return params.data ? JSON.parse(params.data) : null; } catch { return null; }
  }, [params.data]);

  // Check if this workout was auto-detected from Strava
  const workoutLog = weekLog.find(l => l.day_of_week === (workout?.day || ''));
  const isCompleted = workoutLog?.status === 'completed';
  const hasRPE = isCompleted && (workoutLog?.rpe ?? 0) > 0;
  const detected = detectedRuns.find(d => d.day === (workout?.day || ''));

  const handleRPESelect = useCallback((rpe: number) => {
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (userId && workout?.day) confirmDetectedRun(userId, workout.day, rpe);
    setShowRPE(false);
  }, [userId, workout, confirmDetectedRun]);

  const handleExportWatch = useCallback(async () => {
    if (!workout) return;
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Build a clean text representation for sharing/watch
    const lines: string[] = [];
    lines.push(`🏃 ${workout.title || TYPE_LABELS[workout.type] || workout.type}`);
    lines.push(`📅 ${DAYS_DISPLAY[workout.day] || workout.day}`);
    if (workout.distance_km) lines.push(`📏 ${workout.distance_km}km`);
    if (workout.duration_min) lines.push(`⏱ ${workout.duration_min}min`);
    if (workout.pace_target) lines.push(`💨 Pace: ${workout.pace_target}`);
    lines.push('');
    if (hasContent(workout.warmup)) lines.push(`🔥 Aquecimento: ${workout.warmup}`);
    if (hasContent(workout.main)) lines.push(`⚡ Principal: ${workout.main}`);
    if (hasContent(workout.cooldown)) lines.push(`❄️ Desaquecimento: ${workout.cooldown}`);
    if (hasContent(workout.session_goal)) { lines.push(''); lines.push(`🎯 Meta: ${workout.session_goal}`); }
    lines.push('');
    lines.push('— Coach VITTA UP');

    try {
      await Share.share({ message: lines.join('\n'), title: workout.title || 'Treino VITTA UP' });
    } catch {}
  }, [workout]);

  if (!workout) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#0D0D0D', '#1A1008', '#0D0D0D']} style={StyleSheet.absoluteFill} />
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>Treino não encontrado</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.emptyBtn}>
            <Text style={s.emptyBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const safeType = workout.type || 'easy';
  const typeColor = TYPE_COLORS[safeType] || '#FF6C24';
  const typeLabel = TYPE_LABELS[safeType] || safeType;
  const dayDisplay = DAYS_DISPLAY[workout.day] || workout.day;
  const isRest = safeType === 'descanso';

  const displayTitle = hasContent(workout.title) ? workout.title : typeLabel;
  const displayObjective = hasContent(workout.objective) ? workout.objective : '';

  const statItems: { label: string; value: string; unit?: string; color?: string }[] = [];
  if (workout.distance_km != null && workout.distance_km > 0)
    statItems.push({ label: 'Distância', value: String(workout.distance_km), unit: 'km', color: typeColor });
  if (workout.duration_min != null && workout.duration_min > 0)
    statItems.push({ label: 'Duração', value: String(workout.duration_min), unit: 'min' });
  if (hasContent(workout.pace_target))
    statItems.push({ label: 'Pace', value: workout.pace_target! });
  if (hasContent(workout.rpe_target))
    statItems.push({ label: 'RPE', value: workout.rpe_target! });

  const hasWarmup = hasContent(workout.warmup);
  const hasMain = hasContent(workout.main);
  const hasCooldown = hasContent(workout.cooldown);
  const hasStructure = hasWarmup || hasMain || hasCooldown;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.backBtn}>
          <ChevronBack />
        </TouchableOpacity>
        <Text style={s.headerDay}>{dayDisplay}</Text>
        <TouchableOpacity onPress={handleExportWatch} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.watchBtn}>
          <WatchIcon />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(80).duration(500).springify().damping(16)} style={s.hero}>
          <View style={[s.heroIconWrap, { borderColor: `${typeColor}25` }]}>
            <LinearGradient colors={[`${typeColor}20`, `${typeColor}08`]} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
            <LottieView source={getTypeLottie(safeType)} autoPlay loop speed={0.6} style={{ width: 48, height: 48 }} />
          </View>

          <View style={[s.typeBadge, { backgroundColor: `${typeColor}15`, borderColor: `${typeColor}30` }]}>
            <Text style={[s.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>

          <Text style={s.heroTitle}>{displayTitle}</Text>
          {displayObjective ? <Text style={s.heroObjective}>{displayObjective}</Text> : null}
        </Animated.View>

        {/* Session Goal */}
        {hasContent(workout.session_goal) ? (
          <GlassCard delay={160} style={s.goalCard}>
            <View style={s.goalHeader}>
              <LottieView source={LT_TARGET} autoPlay loop speed={0.5} style={{ width: 40, height: 40 }} />
              <Text style={s.goalLabel}>Meta da sessão</Text>
            </View>
            <Text style={s.goalText}>{workout.session_goal}</Text>
          </GlassCard>
        ) : null}

        {/* Stats */}
        {statItems.length > 0 ? (
          <View style={s.statsRow}>
            {statItems.map((item, i) => (
              <StatCard key={item.label} label={item.label} value={item.value} unit={item.unit} color={item.color} delay={220 + i * 40} />
            ))}
          </View>
        ) : null}

        {/* Structured Steps */}
        {hasStructure ? (
          <View style={s.section}>
            <Animated.Text entering={FadeInDown.delay(360).duration(400)} style={s.sectionTitle}>Estrutura do treino</Animated.Text>
            {hasWarmup ? <StepCard step="warmup" text={workout.warmup!} delay={400} /> : null}
            {hasMain ? <StepCard step="main" text={workout.main!} delay={440} parseAsIntervals /> : null}
            {hasCooldown ? <StepCard step="cooldown" text={workout.cooldown!} delay={480} /> : null}
          </View>
        ) : null}

        {/* Feel */}
        {hasContent(workout.feel) ? (
          <GlassCard delay={520}>
            <View style={s.infoHeader}>
              <LottieView source={LT_SATISFACTION} autoPlay loop speed={0.5} style={{ width: 40, height: 40 }} />
              <Text style={s.infoTitle}>Sensação esperada</Text>
            </View>
            <Text style={s.infoText}>{workout.feel}</Text>
          </GlassCard>
        ) : null}

        {/* Coach Tip */}
        {hasContent(workout.tip) ? (
          <GlassCard delay={560} orangeTint>
            <View style={s.infoHeader}>
              <LottieView source={LT_COACH} autoPlay loop speed={0.5} style={{ width: 40, height: 40 }} />
              <Text style={s.infoTitle}>Dica do coach</Text>
            </View>
            <Text style={s.infoText}>{workout.tip}</Text>
          </GlassCard>
        ) : null}

        {/* Description */}
        {hasContent(workout.description) ? (
          <GlassCard delay={600}>
            <Text style={s.descText}>{workout.description}</Text>
          </GlassCard>
        ) : null}

        {/* Export to Watch Card */}
        {!isRest && (
          <Animated.View entering={FadeInDown.delay(640).duration(400)}>
            <TouchableOpacity style={s.exportCard} activeOpacity={0.8} onPress={handleExportWatch}>
              {!isWeb && <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />}
              <WatchIcon />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.exportTitle}>Exportar para relógio</Text>
                <Text style={s.exportSub}>Compartilhe o treino para consultar durante a corrida</Text>
              </View>
              <ShareIcon />
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Status Bar */}
      {!isRest && (
        <Animated.View entering={FadeInDown.delay(650).duration(500).springify().damping(14)} style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(13,13,13,0.0)', 'rgba(13,13,13,0.95)', 'rgba(13,13,13,1)']} locations={[0, 0.3, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

          {isCompleted && hasRPE ? (
            /* Already completed + rated */
            <View style={s.statusDone}>
              <CheckIcon />
              <Text style={s.statusDoneText}>Treino concluído</Text>
              <Text style={s.statusDoneRPE}>{RPE_OPTIONS.find(r => r.value === workoutLog?.rpe)?.emoji || '✓'}</Text>
            </View>
          ) : isCompleted && !hasRPE ? (
            /* Completed via Strava but needs RPE */
            <View style={s.bottomContent}>
              <View style={s.statusDetected}>
                <View style={s.statusDetectedBadge}>
                  <Text style={s.statusDetectedBadgeText}>Strava</Text>
                </View>
                <Text style={s.statusDetectedText}>
                  {detected ? `${detected.actualDistance.toFixed(1)}km · ${detected.actualPace}` : 'Corrida detectada'}
                </Text>
              </View>
              <TouchableOpacity style={s.rateBtn} activeOpacity={0.85} onPress={() => {
                if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowRPE(true);
              }}>
                <LinearGradient colors={['#FF6C24', '#FF8540']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 27 }]} />
                <Text style={s.rateBtnText}>Como foi?</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Not completed yet */
            <View style={s.statusPending}>
              <View style={s.statusPendingDot} />
              <Text style={s.statusPendingText}>Aguardando dados do relógio</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* RPE Selector Modal */}
      {showRPE && <RPESelector onSelect={handleRPESelect} onCancel={() => setShowRPE(false)} />}
    </View>
  );
}

// ══════════════════════════════════════
// Styles
// ══════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  headerDay: { fontFamily: FONTS.montserrat.semibold, fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  watchBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,108,36,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)' },

  // Hero
  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 18, borderWidth: 0.5, shadowColor: '#FF6C24', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  typeBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, marginBottom: 14 },
  typeBadgeText: { fontFamily: FONTS.montserrat.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 },
  heroTitle: { fontFamily: FONTS.playfair.bold, fontSize: 28, color: '#fff', textAlign: 'center', lineHeight: 36, marginBottom: 8 },
  heroObjective: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },

  // Glass Card
  glassCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: isWeb ? 'rgba(255,255,255,0.05)' : 'transparent', marginBottom: 14 },
  glassCardInner: { padding: 18 },

  // Goal
  goalCard: { borderColor: 'rgba(255,108,36,0.25)', borderWidth: 1.5 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  goalLabel: { fontFamily: FONTS.montserrat.bold, fontSize: 11, color: '#FF6C24', textTransform: 'uppercase', letterSpacing: 1 },
  goalText: { fontFamily: FONTS.montserrat.medium, fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, marginTop: 4 },
  statCard: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: isWeb ? 'rgba(255,255,255,0.03)' : 'transparent' },
  statCardInner: { padding: 14, alignItems: 'center' },
  statValue: { fontFamily: FONTS.montserrat.bold, fontSize: 18, color: '#FF6C24' },
  statUnit: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  statLabel: { fontFamily: FONTS.montserrat.regular, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  // Section
  section: { marginTop: 6, marginBottom: 6 },
  sectionTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 14, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

  // Steps
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 14 },
  stepText: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 21 },

  // Intervals
  intervalBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6, borderRadius: 14, backgroundColor: 'rgba(255,108,36,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.12)' },
  intervalRepBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,108,36,0.15)', alignItems: 'center', justifyContent: 'center' },
  intervalRepText: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#FF6C24' },
  intervalDetails: { flex: 1 },
  intervalDistance: { fontFamily: FONTS.montserrat.semibold, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  intervalPace: { fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  intervalRestBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,172,125,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,172,125,0.15)' },
  intervalRestText: { fontFamily: FONTS.montserrat.medium, fontSize: 11, color: 'rgba(255,172,125,0.7)' },

  // Info cards
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  infoText: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 21 },

  // Description
  descText: { fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20 },

  // Export card
  exportCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.12)', backgroundColor: isWeb ? 'rgba(255,255,255,0.03)' : 'transparent', marginBottom: 14, overflow: 'hidden' },
  exportTitle: { fontFamily: FONTS.montserrat.semibold, fontSize: 14, color: '#FF6C24' },
  exportSub: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20, overflow: 'hidden' },
  bottomContent: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  // Status: done
  statusDone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 27, backgroundColor: 'rgba(76,175,80,0.1)', borderWidth: 0.5, borderColor: 'rgba(76,175,80,0.2)' },
  statusDoneText: { fontFamily: FONTS.montserrat.bold, fontSize: 15, color: '#4CAF50' },
  statusDoneRPE: { fontSize: 20 },

  // Status: detected from Strava, needs RPE
  statusDetected: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDetectedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(252,82,0,0.12)', borderWidth: 0.5, borderColor: 'rgba(252,82,0,0.25)' },
  statusDetectedBadgeText: { fontFamily: FONTS.montserrat.bold, fontSize: 9, color: '#FC5200', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusDetectedText: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  rateBtn: { height: 48, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#FF6C24', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  rateBtnText: { fontFamily: FONTS.montserrat.bold, fontSize: 14, color: '#fff' },

  // Status: pending (waiting for Strava)
  statusPending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54 },
  statusPendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)' },
  statusPendingText: { fontFamily: FONTS.montserrat.medium, fontSize: 13, color: 'rgba(255,255,255,0.2)' },

  // RPE Modal
  rpeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 100 },
  rpeSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 40 },
  rpeHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  rpeTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 6 },
  rpeSub: { fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 24 },
  rpeOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 24 },
  rpeOption: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)' },
  rpeEmoji: { fontSize: 28, marginBottom: 6 },
  rpeLabel: { fontFamily: FONTS.montserrat.medium, fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  rpeConfirmBtn: { flexDirection: 'row', height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', shadowColor: '#FF6C24', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  rpeConfirmText: { fontFamily: FONTS.montserrat.bold, fontSize: 15, color: '#fff' },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyText: { fontFamily: FONTS.montserrat.semibold, fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255,108,36,0.15)' },
  emptyBtnText: { fontFamily: FONTS.montserrat.semibold, fontSize: 14, color: '#FF6C24' },
});

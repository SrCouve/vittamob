import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useCoachStore } from '../../src/stores/coachStore';
import type { DayPlan, WeeklyReview } from '../../src/lib/coach-prompt';
import type { DetectedRun } from '../../src/stores/coachStore';

const { width: SW } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const THUNDER = require('../../assets/thunder-energia.json');
const LT_WHISTLE = require('../../assets/coach/sport-whistle.json');
const LT_TARGET = require('../../assets/coach/mission.json');
const LT_STOPWATCH = require('../../assets/coach/stopwatch.json');
const LT_HEARTBEAT = require('../../assets/coach/heartbeat.json');
const LT_MUSCLE = require('../../assets/coach/arm-muscle.json');
const LT_REST = require('../../assets/coach/sleep.json');
const LT_SPEED = require('../../assets/coach/stopwatch.json');

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const PHASE_LABELS: Record<string, string> = {
  base: 'Base', construcao: 'Construção', especifico: 'Específico',
  taper: 'Taper', recuperacao: 'Recuperação',
};

const TYPE_CONFIG: Record<string, { lottie: any; color: string; label: string }> = {
  descanso: { lottie: LT_REST, color: 'rgba(255,255,255,0.15)', label: 'Descanso' },
  easy: { lottie: LT_HEARTBEAT, color: '#4CAF50', label: 'Leve' },
  long: { lottie: LT_MUSCLE, color: '#2196F3', label: 'Longão' },
  tempo: { lottie: LT_SPEED, color: '#FF9800', label: 'Tempo' },
  interval: { lottie: LT_STOPWATCH, color: '#FF6C24', label: 'Intervalado' },
  repetition: { lottie: LT_SPEED, color: '#E91E63', label: 'Repetição' },
  recovery: { lottie: LT_REST, color: '#9C27B0', label: 'Recuperação' },
};

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

function ChatIcon() {
  return <LottieView source={require('../../assets/coach/presentation.json')} autoPlay loop speed={0.5} style={{ width: 24, height: 24 }} />;
}

// ══════════════════════════════════════
// Sub-components
// ══════════════════════════════════════

function DayDot({ status, isToday }: { status: 'done' | 'skipped' | 'pending'; isToday: boolean }) {
  const size = 8;
  const bg = status === 'done' ? '#4CAF50' : status === 'skipped' ? 'rgba(255,255,255,0.08)' : 'transparent';
  const border = isToday ? '#FF6C24' : status === 'pending' ? 'rgba(255,255,255,0.12)' : 'transparent';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: isToday || status === 'pending' ? 1.5 : 0, borderColor: border }} />
  );
}

function TypeIcon({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.easy;
  return <LottieView source={config.lottie} autoPlay loop speed={0.7} style={{ width: 35, height: 35, marginRight: 6 }} />;
}

// ══════════════════════════════════════
// Weekly Review Card
// ══════════════════════════════════════

function ReviewCard({ review }: { review: WeeklyReview }) {
  const pct = review.compliance_pct ?? 0;
  const complianceColor = pct >= 80 ? '#4CAF50' : pct >= 60 ? '#FFC107' : '#FF5722';
  const fatigueEmoji = review.fatigue_level === 'fresh' ? '💚' : review.fatigue_level === 'normal' ? '🟡' : review.fatigue_level === 'fatigued' ? '🟠' : '🔴';

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(400)}>
      <View style={s.reviewCard}>
        {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={['rgba(76,175,80,0.06)', 'rgba(76,175,80,0.01)']} style={StyleSheet.absoluteFill} />

        <View style={s.reviewHeader}>
          <Text style={s.reviewTitle}>Resumo da semana</Text>
          <View style={[s.reviewBadge, { backgroundColor: `${complianceColor}20`, borderColor: `${complianceColor}40` }]}>
            <Text style={[s.reviewBadgeText, { color: complianceColor }]}>{pct}%</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.reviewStatsRow}>
          <View style={s.reviewStat}>
            <Text style={s.reviewStatValue}>{(review.volume_completed_km ?? 0).toFixed(1)}</Text>
            <Text style={s.reviewStatLabel}>km feitos</Text>
          </View>
          <View style={s.reviewStatDivider} />
          <View style={s.reviewStat}>
            <Text style={s.reviewStatValue}>{(review.volume_prescribed_km ?? 0).toFixed(1)}</Text>
            <Text style={s.reviewStatLabel}>km planejado</Text>
          </View>
          <View style={s.reviewStatDivider} />
          <View style={s.reviewStat}>
            <Text style={s.reviewStatValue}>{fatigueEmoji}</Text>
            <Text style={s.reviewStatLabel}>fadiga</Text>
          </View>
          <View style={s.reviewStatDivider} />
          <View style={s.reviewStat}>
            <Text style={s.reviewStatValue}>{(review.avg_rpe ?? 0).toFixed(1)}</Text>
            <Text style={s.reviewStatLabel}>RPE médio</Text>
          </View>
        </View>

        {/* Coach analysis */}
        <View style={s.reviewAnalysis}>
          <LottieView source={LT_WHISTLE} autoPlay loop speed={0.5} style={{ width: 35, height: 35, marginRight: 8 }} />
          <Text style={s.reviewAnalysisText}>{review.coach_analysis}</Text>
        </View>

        {/* Highlights */}
        {review.highlights?.length > 0 && (
          <View style={s.reviewHighlights}>
            {review.highlights.map((h, i) => (
              <View key={i} style={s.reviewHighlightRow}>
                <Text style={s.reviewHighlightDot}>✓</Text>
                <Text style={s.reviewHighlightText}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Concerns */}
        {review.concerns?.length > 0 && (
          <View style={[s.reviewHighlights, { marginTop: 8 }]}>
            {review.concerns.map((c, i) => (
              <View key={i} style={s.reviewHighlightRow}>
                <Text style={[s.reviewHighlightDot, { color: '#FF9800' }]}>!</Text>
                <Text style={[s.reviewHighlightText, { color: 'rgba(255,152,0,0.7)' }]}>{c}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Detected Run Card (auto from Strava)
// ══════════════════════════════════════

const RPE_MINI = [
  { value: 1, emoji: '😴', label: 'Fácil' },
  { value: 2, emoji: '😊', label: 'Leve' },
  { value: 3, emoji: '🙂', label: 'Moderado' },
  { value: 4, emoji: '😤', label: 'Forte' },
  { value: 5, emoji: '🥵', label: 'Pesado' },
];

const DAYS_DISPLAY_SHORT: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda', terca: 'Terça',
  quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado',
};

function DetectedRunCard({ run, showRPE, onRequestRPE, onConfirmRPE }: {
  run: DetectedRun;
  showRPE: boolean;
  onRequestRPE: () => void;
  onConfirmRPE: (rpe: number) => void;
}) {
  const durationMin = Math.round(run.actualTimeSeconds / 60);
  const config = TYPE_CONFIG[run.prescribedType] || TYPE_CONFIG.easy;

  return (
    <Animated.View entering={FadeInDown.delay(50).duration(400)}>
      <View style={s.detectedCard}>
        {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={['rgba(76,175,80,0.08)', 'rgba(76,175,80,0.02)']} style={StyleSheet.absoluteFill} />

        {/* Header */}
        <View style={s.detectedHeader}>
          <View style={[s.detectedIconWrap, { backgroundColor: `${config.color}15` }]}>
            <LottieView source={config.lottie} autoPlay loop speed={0.6} style={{ width: 35, height: 35 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.detectedTitle}>Corrida detectada</Text>
            <Text style={s.detectedSub}>{DAYS_DISPLAY_SHORT[run.day]} · {run.prescribedTitle}</Text>
          </View>
          <View style={s.detectedStravaBadge}>
            <Text style={s.detectedStravaText}>Strava</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.detectedStats}>
          <View style={s.detectedStatItem}>
            <Text style={s.detectedStatValue}>{run.actualDistance.toFixed(1)}</Text>
            <Text style={s.detectedStatLabel}>km</Text>
          </View>
          <View style={s.detectedStatDivider} />
          <View style={s.detectedStatItem}>
            <Text style={s.detectedStatValue}>{run.actualPace}</Text>
            <Text style={s.detectedStatLabel}>pace</Text>
          </View>
          <View style={s.detectedStatDivider} />
          <View style={s.detectedStatItem}>
            <Text style={s.detectedStatValue}>{durationMin}</Text>
            <Text style={s.detectedStatLabel}>min</Text>
          </View>
          {run.prescribedDistance ? (
            <>
              <View style={s.detectedStatDivider} />
              <View style={s.detectedStatItem}>
                <Text style={[s.detectedStatValue, { color: 'rgba(255,255,255,0.3)' }]}>{run.prescribedDistance}</Text>
                <Text style={s.detectedStatLabel}>prescrito</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* RPE selector or button */}
        {showRPE ? (
          <View style={s.detectedRPERow}>
            <Text style={s.detectedRPELabel}>Como foi?</Text>
            <View style={s.detectedRPEOptions}>
              {RPE_MINI.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={s.detectedRPEBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onConfirmRPE(opt.value);
                  }}
                >
                  <Text style={s.detectedRPEEmoji}>{opt.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.detectedRateBtn} activeOpacity={0.8} onPress={onRequestRPE}>
            <Text style={s.detectedRateBtnText}>Como se sentiu?</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Workout Card
// ══════════════════════════════════════

function WorkoutCard({ day, isToday, highlight }: { day: DayPlan; isToday?: boolean; highlight?: boolean }) {
  const type = day?.type || 'descanso';
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.easy;
  const isRest = type === 'descanso';
  const dayName = day?.day || '';

  return (
    <TouchableOpacity
      style={[s.workoutCard, highlight && s.workoutCardHighlight, isRest && s.workoutCardRest]}
      activeOpacity={isRest ? 1 : 0.8}
      disabled={isRest}
      onPress={isRest ? undefined : () => router.push({ pathname: '/coach/workout', params: { data: JSON.stringify(day) } } as any)}
    >
      {highlight && !isWeb && <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />}
      {highlight && <LinearGradient colors={['rgba(255,108,36,0.1)', 'rgba(255,108,36,0.03)']} style={StyleSheet.absoluteFill} />}

      <View style={[s.workoutDayCol, isToday && { borderColor: '#FF6C24' }]}>
        <Text style={[s.workoutDayText, isToday && { color: '#FF6C24' }]}>
          {DAYS_PT[DAYS_FULL.indexOf(dayName)] || dayName.slice(0, 3) || '—'}
        </Text>
      </View>

      <View style={[s.workoutIconWrap, { backgroundColor: isRest ? 'rgba(255,255,255,0.03)' : `${config.color}15` }]}>
        <LottieView source={config.lottie} autoPlay loop speed={isRest ? 0.4 : 0.7} style={{ width: 35, height: 35 }} />
      </View>

      <View style={s.workoutInfo}>
        <Text style={[s.workoutType, isRest && { color: 'rgba(255,255,255,0.2)' }]}>{day?.title || config.label}</Text>
        {!isRest && day?.feel ? <Text style={s.workoutDesc} numberOfLines={1}>{day.feel}</Text> : null}
      </View>

      {!isRest && day?.distance_km != null ? (
        <View style={s.workoutDistCol}>
          <Text style={s.workoutDist}>{day.distance_km}</Text>
          <Text style={s.workoutDistUnit}>km</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════
// Main Coach Screen
// ══════════════════════════════════════

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    profile, currentPlan, todayWorkout, weekLog, detectedRuns, lastReview,
    hasCoach, isLoading, needsReview,
    fetchCoachProfile, fetchCurrentPlan, fetchWeekLog, syncStravaWithCoach, confirmDetectedRun,
  } = useCoachStore();
  const [rpeForDay, setRpeForDay] = useState<string | null>(null);
  const [showVdotInfo, setShowVdotInfo] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchCoachProfile(userId).then(() => setInitialLoaded(true));
        fetchCurrentPlan(userId);
        fetchWeekLog(userId);
        syncStravaWithCoach(userId);
      }
    }, [userId]),
  );

  const dayStatus = useCallback((dayName: string): 'done' | 'skipped' | 'pending' => {
    const log = weekLog.find(l => l.day_of_week === dayName);
    if (log?.status === 'completed') return 'done';
    if (log?.status === 'skipped') return 'skipped';
    return 'pending';
  }, [weekLog]);

  // Wait for first fetch before deciding
  if (!initialLoaded) {
    return null;
  }

  // Not set up — redirect to onboarding
  if (!hasCoach) {
    router.replace('/coach/onboarding' as any);
    return null;
  }

  if (isLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={['#0D0D0D', '#1A1008', '#0D0D0D']} style={StyleSheet.absoluteFill} />
        <LottieView source={THUNDER} autoPlay loop speed={0.7} style={{ width: 60, height: 60 }} />
      </View>
    );
  }

  const todayIndex = new Date().getDay();
  const todayName = DAYS_FULL[todayIndex];
  const weekProgress = currentPlan?.total_weeks ? (currentPlan.current_week / currentPlan.total_weeks) * 100 : 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0D0D', '#1A1008', '#201510', '#0D0D0D']} locations={[0, 0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Meu Treinador</Text>
          <TouchableOpacity onPress={() => router.push('/coach/chat' as any)} style={s.chatBtn}>
            {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
            <LinearGradient
              colors={['rgba(255,108,36,0.15)', 'rgba(255,108,36,0.05)', 'rgba(255,133,64,0.08)']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,108,36,0.3)', borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
            <ChatIcon />
            <Text style={s.chatBtnText}>Falar com o coach</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Plan Overview Card */}
        {currentPlan && profile && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={s.overviewCard}>
              {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
              <LinearGradient colors={['rgba(255,108,36,0.08)', 'rgba(255,108,36,0.02)']} style={StyleSheet.absoluteFill} />

              <View style={s.overviewTop}>
                <View>
                  <Text style={s.overviewPhase}>{currentPlan.phase_label || PHASE_LABELS[currentPlan.phase] || currentPlan.phase}</Text>
                  <Text style={s.overviewWeek}>Semana {currentPlan.current_week} de {currentPlan.total_weeks}</Text>
                </View>
                <TouchableOpacity style={s.vdotBadge} activeOpacity={0.8} onPress={() => setShowVdotInfo(!showVdotInfo)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.vdotLabel}>VDOT</Text>
                    <View style={s.vdotInfoDot}><Text style={s.vdotInfoDotText}>i</Text></View>
                  </View>
                  <Text style={s.vdotValue}>{profile.vdot || '--'}</Text>
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={s.progressTrack}>
                <Animated.View entering={FadeIn.delay(300).duration(800)} style={[s.progressFill, { width: `${weekProgress}%` }]}>
                  <LinearGradient colors={['#FF6C24', '#FFAC7D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
              </View>

              <View style={s.overviewStats}>
                <View style={s.overviewStat}>
                  <Text style={s.overviewStatValue}>{currentPlan.weekly_volume_km ?? '—'}km</Text>
                  <Text style={s.overviewStatLabel}>volume</Text>
                </View>
                <View style={s.overviewStatDivider} />
                <View style={s.overviewStat}>
                  <Text style={s.overviewStatValue}>{(currentPlan.days ?? []).filter(d => d.type !== 'descanso').length}</Text>
                  <Text style={s.overviewStatLabel}>treinos</Text>
                </View>
                <View style={s.overviewStatDivider} />
                <View style={s.overviewStat}>
                  <Text style={s.overviewStatValue}>{profile?.goal === 'prova' ? (profile.race_distance?.toUpperCase() ?? '—') : '—'}</Text>
                  <Text style={s.overviewStatLabel}>objetivo</Text>
                </View>
              </View>

              {/* Predicted race times */}
              {(profile?.predicted_5k || profile?.predicted_10k || profile?.predicted_21k) ? (
                <View style={s.predictedRow}>
                  <LottieView source={LT_STOPWATCH} autoPlay loop speed={0.5} style={{ width: 35, height: 35, marginRight: 8 }} />
                  {profile.predicted_5k ? <Text style={s.predictedText}>5K: {profile.predicted_5k}</Text> : null}
                  {profile.predicted_5k && profile.predicted_10k ? <Text style={s.predictedDivider}>|</Text> : null}
                  {profile.predicted_10k ? <Text style={s.predictedText}>10K: {profile.predicted_10k}</Text> : null}
                  {profile.predicted_10k && profile.predicted_21k ? <Text style={s.predictedDivider}>|</Text> : null}
                  {profile.predicted_21k ? <Text style={s.predictedText}>21K: {profile.predicted_21k}</Text> : null}
                </View>
              ) : null}

              {/* Training zones */}
              {profile?.zones ? (
                <View style={s.zonesRow}>
                  {profile.zones.E ? <View style={s.zonePill}><Text style={s.zoneLabel}>E</Text><Text style={s.zonePace}>{profile.zones.E.min ?? '—'}</Text></View> : null}
                  {profile.zones.T ? <View style={s.zonePill}><Text style={s.zoneLabel}>T</Text><Text style={s.zonePace}>{profile.zones.T.pace ?? '—'}</Text></View> : null}
                  {profile.zones.I ? <View style={s.zonePill}><Text style={s.zoneLabel}>I</Text><Text style={s.zonePace}>{profile.zones.I.pace ?? '—'}</Text></View> : null}
                  {profile.zones.R ? <View style={s.zonePill}><Text style={s.zoneLabel}>R</Text><Text style={s.zonePace}>{profile.zones.R.pace ?? '—'}</Text></View> : null}
                </View>
              ) : null}

              {/* Weekly day dots */}
              {currentPlan.days?.length ? (
                <View style={s.dayDotsRow}>
                  {currentPlan.days.map((d) => (
                    <View key={d.day} style={s.dayDotWrap}>
                      <DayDot status={d.type === 'descanso' ? (DAYS_FULL.indexOf(d.day) <= todayIndex ? 'done' : 'pending') : dayStatus(d.day)} isToday={d.day === todayName} />
                      <Text style={[s.dayDotLabel, d.day === todayName && { color: '#FF6C24' }]}>
                        {DAYS_PT[DAYS_FULL.indexOf(d.day)] || d.day.slice(0, 3)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {profile?.goal_message ? (
                <View style={s.goalMessageRow}>
                  <LottieView source={LT_TARGET} autoPlay loop speed={0.5} style={{ width: 35, height: 35, marginRight: 8 }} />
                  <Text style={s.goalMessageText}>{profile.goal_message}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        )}

        {/* VDOT Info Tooltip */}
        {showVdotInfo && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity activeOpacity={0.95} onPress={() => setShowVdotInfo(false)} style={s.vdotTooltip}>
              {!isWeb && <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />}
              <LinearGradient colors={['rgba(255,108,36,0.1)', 'rgba(255,108,36,0.03)']} style={StyleSheet.absoluteFill} />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,108,36,0.25)' }} />
              <Text style={s.vdotTooltipTitle}>O que é VDOT?</Text>
              <Text style={s.vdotTooltipText}>
                VDOT é um índice criado pelo treinador Jack Daniels que mede sua capacidade aeróbica com base nos seus tempos de corrida. Quanto maior o número, mais rápido e eficiente você é.
              </Text>
              <Text style={s.vdotTooltipText}>
                Ele define seus paces ideais para cada tipo de treino: leve, moderado, forte e intervalado. Assim cada treino fica no ritmo certo pra você evoluir sem se machucar.
              </Text>
              <Text style={s.vdotTooltipClose}>Toque pra fechar</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Detected Strava Runs — awaiting RPE */}
        {detectedRuns.length > 0 && detectedRuns.map((run) => (
          <DetectedRunCard
            key={run.day}
            run={run}
            showRPE={rpeForDay === run.day}
            onRequestRPE={() => setRpeForDay(run.day)}
            onConfirmRPE={(rpe) => {
              if (userId) confirmDetectedRun(userId, run.day, rpe);
              setRpeForDay(null);
            }}
          />
        ))}

        {/* Weekly Review (if available) */}
        {lastReview && <ReviewCard review={lastReview} />}

        {/* Beta: Week 1 only — coming soon teaser */}
        {needsReview && (
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <View style={s.betaCard}>
              {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
              <LinearGradient colors={['rgba(255,108,36,0.1)', 'rgba(255,108,36,0.03)']} style={StyleSheet.absoluteFill} />
              <LottieView source={THUNDER} autoPlay loop speed={0.6} style={{ width: 50, height: 50, alignSelf: 'center', marginBottom: 12 }} />
              <Text style={s.betaTitle}>Primeira semana concluída!</Text>
              <Text style={s.betaSub}>
                Você acabou de testar o Coach VITTA na versão beta. Seu plano personalizado, seus treinos adaptados ao seu ritmo, tudo isso vai ficar ainda melhor.
              </Text>
              <Text style={s.betaSub}>
                Em breve: planos semanais contínuos, avaliação de evolução, ajustes automáticos e muito mais. Fique de olho nas novidades.
              </Text>
              <View style={s.betaBadge}>
                <Text style={s.betaBadgeText}>Beta</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Weekly Note */}
        {currentPlan?.weekly_note && currentPlan.weekly_note.trim() ? (
          <Animated.View entering={FadeInDown.delay(70).duration(400)}>
            <View style={s.weeklyNoteCard}>
              {!isWeb && <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />}
              <LottieView source={LT_WHISTLE} autoPlay loop speed={0.5} style={{ width: 35, height: 35, marginRight: 10 }} />
              <Text style={s.weeklyNoteText}>{currentPlan.weekly_note}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Weekly Meta */}
        {currentPlan?.weekly_meta && typeof currentPlan.weekly_meta === 'string' && currentPlan.weekly_meta.trim() ? (
          <Animated.View entering={FadeInDown.delay(85).duration(400)}>
            <View style={s.weeklyMetaCard}>
              <LottieView source={LT_TARGET} autoPlay loop speed={0.5} style={{ width: 35, height: 35, marginRight: 8 }} />
              <Text style={s.weeklyMetaText}>{currentPlan.weekly_meta}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Today's Workout */}
        {todayWorkout && todayWorkout.type !== 'descanso' && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={s.sectionTitle}>Hoje</Text>
            <TouchableOpacity
              style={s.todayBigCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/coach/workout', params: { data: JSON.stringify(todayWorkout) } } as any)}
            >
              {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
              <LinearGradient colors={['rgba(255,108,36,0.12)', 'rgba(255,108,36,0.03)']} style={StyleSheet.absoluteFill} />
              <View style={s.todayBigTop}>
                {(() => { const cfg = TYPE_CONFIG[todayWorkout.type] || TYPE_CONFIG.easy; return (
                  <View style={[s.workoutIconWrapLg, { backgroundColor: `${cfg.color}15` }]}>
                    <LottieView source={cfg.lottie} autoPlay loop speed={0.6} style={{ width: 35, height: 35 }} />
                  </View>
                ); })()}
                {todayWorkout.distance_km != null ? (
                  <View style={s.workoutDistCol}>
                    <Text style={s.workoutDist}>{todayWorkout.distance_km}</Text>
                    <Text style={s.workoutDistUnit}>km</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[s.todayBigTitle, { marginBottom: 4 }]}>{todayWorkout.title || (TYPE_CONFIG[todayWorkout.type] || TYPE_CONFIG.easy).label}</Text>
              {todayWorkout.feel ? (
                <Text style={s.todayBigObjective}>{todayWorkout.feel}</Text>
              ) : todayWorkout.objective ? (
                <Text style={s.todayBigObjective}>{todayWorkout.objective}</Text>
              ) : null}
              <View style={s.todayBigBtn}>
                <Text style={s.todayBigBtnText}>Ver detalhes</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Today — rest day */}
        {todayWorkout && todayWorkout.type === 'descanso' && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={s.sectionTitle}>Hoje</Text>
            <WorkoutCard day={todayWorkout} isToday highlight />
          </Animated.View>
        )}

        {/* Week Schedule */}
        {currentPlan && currentPlan.days?.length ? (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text style={s.sectionTitle}>Esta semana</Text>
            {currentPlan.days.map((day, i) => (
              <Animated.View key={day?.day || i} entering={FadeInDown.delay(200 + i * 50).duration(300)}>
                <WorkoutCard day={day} isToday={day?.day === todayName} />
              </Animated.View>
            ))}
          </Animated.View>
        ) : null}

        {/* Beta badge at bottom */}
        {currentPlan && (
          <Animated.View entering={FadeInDown.delay(500).duration(300)}>
            <View style={s.betaFooter}>
              <Text style={s.betaFooterText}>Coach VITTA · versão beta</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 14 },
  headerTitle: { fontFamily: FONTS.playfair.bold, fontSize: 22, color: '#fff' },

  // Chat button
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 36, paddingHorizontal: 12, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,108,36,0.25)',
    backgroundColor: isWeb ? 'rgba(255,108,36,0.08)' : 'transparent',
    shadowColor: '#FF6C24', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 },
  },
  chatBtnText: { fontFamily: FONTS.montserrat.semibold, fontSize: 11, color: '#FF8540' },

  // Talk to coach
  talkCoachCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 20, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: isWeb ? 'rgba(255,255,255,0.05)' : 'transparent',
    marginBottom: 16,
  },
  talkCoachTitle: { fontFamily: FONTS.montserrat.semibold, fontSize: 15, color: '#fff' },
  talkCoachSub: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, lineHeight: 15 },
  talkCoachArrow: {
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: 'rgba(255,108,36,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontFamily: FONTS.playfair.bold, fontSize: 26, color: '#fff', textAlign: 'center', marginBottom: 12 },
  emptySub: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  setupBtn: { flexDirection: 'row', height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%', maxWidth: 300, shadowColor: '#FF6C24', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  setupBtnText: { fontFamily: FONTS.montserrat.bold, fontSize: 15, color: '#fff' },

  // Overview
  overviewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.12)', marginBottom: 16, padding: 18, backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent' },
  overviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  overviewPhase: { fontFamily: FONTS.montserrat.bold, fontSize: 11, color: '#FF6C24', textTransform: 'uppercase', letterSpacing: 1.5 },
  overviewWeek: { fontFamily: FONTS.montserrat.semibold, fontSize: 18, color: '#fff', marginTop: 4 },
  vdotBadge: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,108,36,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)' },
  vdotLabel: { fontFamily: FONTS.montserrat.medium, fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 },
  vdotInfoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,108,36,0.2)', alignItems: 'center', justifyContent: 'center' },
  vdotInfoDotText: { fontFamily: FONTS.montserrat.semibold, fontSize: 7, color: '#FF6C24' },
  vdotValue: { fontFamily: FONTS.montserrat.extrabold, fontSize: 20, color: '#FF6C24' },

  // VDOT tooltip
  vdotTooltip: { borderRadius: 20, overflow: 'hidden', padding: 20, marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.2)', backgroundColor: isWeb ? 'rgba(255,255,255,0.05)' : 'transparent' },
  vdotTooltipTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#FF6C24', marginBottom: 10 },
  vdotTooltipText: { fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 20, marginBottom: 8 },
  vdotTooltipClose: { fontFamily: FONTS.montserrat.medium, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 6 },

  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, overflow: 'hidden' } as any,

  overviewStats: { flexDirection: 'row', alignItems: 'center' },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewStatValue: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#fff' },
  overviewStatLabel: { fontFamily: FONTS.montserrat.regular, fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  overviewStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.06)' },

  predictedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  predictedText: { fontFamily: FONTS.montserrat.medium, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  predictedDivider: { fontFamily: FONTS.montserrat.regular, fontSize: 12, color: 'rgba(255,255,255,0.15)', marginHorizontal: 8 },

  zonesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  zonePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,108,36,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.12)' },
  zoneLabel: { fontFamily: FONTS.montserrat.bold, fontSize: 10, color: '#FF6C24' },
  zonePace: { fontFamily: FONTS.montserrat.regular, fontSize: 10, color: 'rgba(255,255,255,0.4)' },

  dayDotsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  dayDotWrap: { alignItems: 'center', gap: 4 },
  dayDotLabel: { fontFamily: FONTS.montserrat.medium, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' },

  goalMessageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  goalMessageText: { flex: 1, fontFamily: FONTS.montserrat.regular, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },

  // Review card
  reviewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(76,175,80,0.15)', marginBottom: 16, padding: 18, backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  reviewTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#fff' },
  reviewBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 0.5 },
  reviewBadgeText: { fontFamily: FONTS.montserrat.bold, fontSize: 14 },
  reviewStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  reviewStat: { flex: 1, alignItems: 'center' },
  reviewStatValue: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#fff' },
  reviewStatLabel: { fontFamily: FONTS.montserrat.regular, fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, textTransform: 'uppercase' },
  reviewStatDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  reviewAnalysis: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  reviewAnalysisText: { flex: 1, fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },
  reviewHighlights: { marginTop: 10 },
  reviewHighlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  reviewHighlightDot: { fontFamily: FONTS.montserrat.bold, fontSize: 12, color: '#4CAF50', width: 16 },
  reviewHighlightText: { flex: 1, fontFamily: FONTS.montserrat.regular, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17 },


  // Section
  sectionTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#fff', marginBottom: 12, marginTop: 8 },

  // Weekly note
  weeklyNoteCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: isWeb ? 'rgba(255,255,255,0.03)' : 'transparent' },
  weeklyNoteText: { flex: 1, fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },

  // Weekly meta
  weeklyMetaCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,108,36,0.2)', backgroundColor: 'rgba(255,108,36,0.04)' },
  weeklyMetaText: { flex: 1, fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: '#FF8540' },

  // Today big card
  todayBigCard: { borderRadius: 20, overflow: 'hidden', padding: 18, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.18)', backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent', marginBottom: 16 },
  todayBigTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  todayBigTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 20, color: '#fff' },
  todayBigObjective: { fontFamily: FONTS.montserrat.regular, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 19, marginBottom: 16 },
  todayBigBtn: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FF6C24', shadowColor: '#FF6C24', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  todayBigBtnText: { fontFamily: FONTS.montserrat.bold, fontSize: 13, color: '#fff' },

  // Workout card
  workoutCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' },
  workoutCardHighlight: { borderColor: 'rgba(255,108,36,0.15)', marginBottom: 16 },
  workoutCardRest: { opacity: 0.5 },

  workoutDayCol: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  workoutDayText: { fontFamily: FONTS.montserrat.semibold, fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  workoutIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  workoutIcon: { width: 20, height: 20 },
  workoutIconWrapLg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  workoutIconLg: { width: 26, height: 26 },

  workoutInfo: { flex: 1 },
  workoutType: { fontFamily: FONTS.montserrat.semibold, fontSize: 14, color: '#fff' },
  workoutDesc: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },

  workoutDistCol: { alignItems: 'center' },
  workoutDist: { fontFamily: FONTS.montserrat.bold, fontSize: 18, color: '#FF6C24' },
  workoutDistUnit: { fontFamily: FONTS.montserrat.regular, fontSize: 9, color: 'rgba(255,255,255,0.25)' },

  // Detected run card
  detectedCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)', marginBottom: 16, padding: 18, backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent' },
  detectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  detectedIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detectedTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 15, color: '#4CAF50' },
  detectedSub: { fontFamily: FONTS.montserrat.regular, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  detectedStravaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(252,82,0,0.12)', borderWidth: 0.5, borderColor: 'rgba(252,82,0,0.25)' },
  detectedStravaText: { fontFamily: FONTS.montserrat.bold, fontSize: 10, color: '#FC5200', textTransform: 'uppercase', letterSpacing: 0.5 },
  detectedStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  detectedStatItem: { flex: 1, alignItems: 'center' },
  detectedStatValue: { fontFamily: FONTS.montserrat.bold, fontSize: 18, color: '#fff' },
  detectedStatLabel: { fontFamily: FONTS.montserrat.regular, fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, textTransform: 'uppercase' },
  detectedStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.06)' },
  detectedRPERow: { paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  detectedRPELabel: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  detectedRPEOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  detectedRPEBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  detectedRPEEmoji: { fontSize: 24 },
  detectedRateBtn: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(76,175,80,0.1)', borderWidth: 0.5, borderColor: 'rgba(76,175,80,0.2)' },
  detectedRateBtnText: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: '#4CAF50' },

  // Beta teaser
  betaCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,108,36,0.2)', marginBottom: 20, padding: 24, backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent' },
  betaTitle: { fontFamily: FONTS.playfair.bold, fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 12 },
  betaSub: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 21, marginBottom: 10 },
  betaBadge: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,108,36,0.12)', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.25)' },
  betaBadgeText: { fontFamily: FONTS.montserrat.bold, fontSize: 11, color: '#FF6C24', textTransform: 'uppercase', letterSpacing: 1.5 },
  betaFooter: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  betaFooterText: { fontFamily: FONTS.montserrat.medium, fontSize: 11, color: 'rgba(255,255,255,0.15)' },
});

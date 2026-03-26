import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Dimensions, Image, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { router } from 'expo-router';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useUserStore } from '../../src/stores/userStore';
import { useCoachStore } from '../../src/stores/coachStore';
import type { GoalType, RaceDistance } from '../../src/lib/coach-prompt';

const { width: SW } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const THUNDER = require('../../assets/thunder-energia.json');
const RUNNING = require('../../assets/running.json');
const HIKER = require('../../assets/hiker-journey.json');

// Icons
const LT_TARGET = require('../../assets/coach/marathon.json');
const LT_CALENDAR = require('../../assets/coach/schedule.json');
const LT_WHISTLE = require('../../assets/coach/sport-whistle.json');
const LT_HEARTBEAT = require('../../assets/coach/heartbeat.json');
const LT_REST = require('../../assets/coach/start-line.json');
const LT_SPEED = require('../../assets/coach/boot-with-lightning.json');

function ChevronBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

// ══════════════════════════════════════
// Step components
// ══════════════════════════════════════

function WelcomeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={s.stepContainer}>
      <TouchableOpacity onPress={onBack} style={{ position: 'absolute', top: 12, left: 4, zIndex: 10, padding: 8 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <ChevronBack />
      </TouchableOpacity>
      <View style={s.stepCenter}>
        <View style={s.welcomeIconWrap}>
          <LottieView source={require('../../assets/personal-trainer.json')} autoPlay loop speed={0.7} style={{ width: 90, height: 90 }} />
          <View style={s.welcomeGlow} />
        </View>
        <Text style={s.welcomeTitle}>Seu plano de{'\n'}corrida começa aqui</Text>
        <Text style={s.welcomeSub}>
          A VITTA AI analisa suas corridas, calcula seu nível e monta um plano semanal sob medida. Tudo baseado em ciência do esporte e nos seus dados reais do Strava.
        </Text>
      </View>
      <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={onNext}>
        <LinearGradient colors={['#FF6C24', '#FF8540']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <LottieView source={require('../../assets/ai-art.json')} autoPlay loop speed={0.6} style={{ width: 50, height: 50, marginLeft: -12, marginRight: -4, marginVertical: -12 }} />
        <Text style={s.primaryBtnText}>Começar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}


function GoalStep({ selected, onSelect }: { selected: GoalType | null; onSelect: (g: GoalType) => void }) {
  const goals: { id: GoalType; lottie: any; title: string; sub: string }[] = [
    { id: 'comecar', lottie: LT_REST, title: 'Começar a correr', sub: 'Nunca corri ou parei há tempo' },
    { id: 'pace', lottie: LT_SPEED, title: 'Correr mais rápido', sub: 'Quero melhorar meu pace' },
    { id: 'prova', lottie: LT_TARGET, title: 'Completar uma prova', sub: 'Tenho uma corrida marcada' },
    { id: 'consistencia', lottie: LT_HEARTBEAT, title: 'Manter consistência', sub: 'Quero correr regular sem parar' },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s.stepContainer}>
      <Text style={s.stepTitle}>Qual seu objetivo?</Text>
      <Text style={s.stepSub}>Isso define a estrutura do seu plano</Text>
      <View style={s.optionsGrid}>
        {goals.map((g, i) => (
          <Animated.View key={g.id} entering={FadeInUp.delay(i * 80).duration(400)}>
            <TouchableOpacity
              style={[s.goalCard, selected === g.id && s.goalCardSelected]}
              activeOpacity={0.8}
              onPress={() => onSelect(g.id)}
            >
              {!isWeb && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
              {selected === g.id && (
                <LinearGradient
                  colors={['rgba(255,108,36,0.12)', 'rgba(255,108,36,0.04)']}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={s.goalLottieWrap}>
                <LottieView source={g.lottie} autoPlay loop speed={selected === g.id ? 0.8 : 0.4} style={{ width: 36, height: 36 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.goalTitle, selected === g.id && { color: '#FF6C24' }]}>{g.title}</Text>
                <Text style={s.goalSub}>{g.sub}</Text>
              </View>
              {selected === g.id && (
                <View style={s.checkDot}>
                  <LinearGradient colors={['#FF6C24', '#FF8540']} style={StyleSheet.absoluteFill} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

function RaceStep({ distance, onSelect }: { distance: RaceDistance | null; onSelect: (d: RaceDistance) => void }) {
  const races: { id: RaceDistance; label: string; desc: string }[] = [
    { id: '5k', label: '5K', desc: '~25-35 min' },
    { id: '10k', label: '10K', desc: '~50-70 min' },
    { id: '21k', label: 'Meia Maratona', desc: '~1h50-2h30' },
    { id: '42k', label: 'Maratona', desc: '~3h30-5h' },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s.stepContainer}>
      <Text style={s.stepTitle}>Qual distância?</Text>
      <Text style={s.stepSub}>Vamos preparar você pra essa prova</Text>
      <View style={s.raceGrid}>
        {races.map((r, i) => (
          <Animated.View key={r.id} entering={FadeInUp.delay(i * 60).duration(400)}>
            <TouchableOpacity
              style={[s.raceCard, distance === r.id && s.raceCardSelected]}
              activeOpacity={0.8}
              onPress={() => onSelect(r.id)}
            >
              <Text style={[s.raceLabel, distance === r.id && { color: '#FF6C24' }]}>{r.label}</Text>
              <Text style={s.raceDesc}>{r.desc}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

function DaysStep({ selectedDays, onToggle }: { selectedDays: string[]; onToggle: (d: string) => void }) {
  const allDays = [
    { id: 'segunda', label: 'Seg' },
    { id: 'terca', label: 'Ter' },
    { id: 'quarta', label: 'Qua' },
    { id: 'quinta', label: 'Qui' },
    { id: 'sexta', label: 'Sex' },
    { id: 'sabado', label: 'Sáb' },
    { id: 'domingo', label: 'Dom' },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s.stepContainer}>
      <LottieView source={LT_CALENDAR} autoPlay loop speed={0.6} style={{ width: 48, height: 48, marginBottom: 16, alignSelf: 'center' }} />
      <Text style={s.stepTitle}>Quais dias você corre?</Text>
      <Text style={s.stepSub}>Selecione os dias que tem disponível pra treinar</Text>
      <View style={s.daysRow}>
        {allDays.map((d) => {
          const active = selectedDays.includes(d.id);
          return (
            <TouchableOpacity
              key={d.id}
              style={[s.dayBtn, active && s.dayBtnSelected]}
              activeOpacity={0.8}
              onPress={() => onToggle(d.id)}
            >
              {active && (
                <LinearGradient colors={['#FF6C24', '#FF8540']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
              )}
              <Text style={[s.dayBtnText, active && { color: '#fff', fontFamily: FONTS.montserrat.bold }]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.daysCount}>{selectedDays.length} dias selecionados</Text>
    </Animated.View>
  );
}

// Pace slider: 4:00/km (fast) to 8:00/km (slow). Value in seconds per km.
const PACE_MIN = 240; // 4:00/km
const PACE_MAX = 480; // 8:00/km
const PACE_DEFAULT = 390; // 6:30/km

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function PaceStep({ paceValue, onChangePace, unknownPace, onToggleUnknown }: {
  paceValue: number; onChangePace: (v: number) => void;
  unknownPace: boolean; onToggleUnknown: () => void;
}) {
  // pct: 0% = slow (8:00), 100% = fast (4:00)
  const pct = unknownPace ? 50 : ((PACE_MAX - paceValue) / (PACE_MAX - PACE_MIN)) * 100;
  const runnerSpeed = unknownPace ? 1.5 : 0.5 + (pct / 100) * 3;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s.stepContainer}>
      <Text style={s.stepTitle}>Qual seu pace atual?</Text>
      <Text style={s.stepSub}>Arraste pra definir ou toque "Não sei"</Text>

      {/* Runner + pace display */}
      <View style={s.paceDisplay}>
        <Text style={s.paceValue}>
          {unknownPace ? '--:--' : formatPace(paceValue)}
        </Text>
        <Text style={s.paceUnit}>/km</Text>
      </View>

      {/* Slider with runner */}
      <View style={s.sliderWrap}>
        <View style={s.sliderLabels}>
          <Text style={s.sliderLabel}>8:00</Text>
          <Text style={s.sliderLabel}>4:00</Text>
        </View>
        <View style={s.sliderTrack}>
          <View style={[s.sliderFill, { width: `${pct}%` }]}>
            <LinearGradient colors={['#FFAC7D', '#FF6C24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </View>
        </View>
        {/* Runner on slider */}
        <View style={[s.sliderRunner, { left: `${pct}%` }]}>
          <LottieView source={RUNNING} autoPlay loop speed={runnerSpeed} style={{ width: 40, height: 40 }} />
        </View>
        {/* Touch area - full width invisible slider */}
        <View
          style={s.sliderTouchArea}
          onStartShouldSetResponder={() => !unknownPace}
          onMoveShouldSetResponder={() => !unknownPace}
          onResponderMove={(e) => {
            if (unknownPace) return;
            const { locationX } = e.nativeEvent;
            const width = SW - 80; // approximate
            const ratio = Math.max(0, Math.min(1, locationX / width));
            // Left = slow (8:00/km), right = fast (4:00/km)
            const newPace = Math.round(PACE_MAX - ratio * (PACE_MAX - PACE_MIN));
            // Snap to 5-second increments
            const snapped = Math.round(newPace / 5) * 5;
            onChangePace(snapped);
          }}
        />
      </View>

      <View style={s.paceSpeedLabels}>
        <Text style={s.paceSpeedLabel}>🐢 Lento</Text>
        <Text style={s.paceSpeedLabel}>Rápido 🐇</Text>
      </View>

      {/* "Não sei" link */}
      <TouchableOpacity
        style={s.unknownBtn}
        activeOpacity={0.7}
        onPress={onToggleUnknown}
      >
        <Text style={s.unknownBtnText}>Não sei meu pace</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const LOADING_PHRASES = [
  { pct: 0, text: 'Calçando o tênis...', icon: '👟' },
  { pct: 15, text: 'Alongando...', icon: '🧘' },
  { pct: 30, text: 'Analisando suas corridas...', icon: '📊' },
  { pct: 45, text: 'Calculando seu VDOT...', icon: '🧮' },
  { pct: 60, text: 'Bebendo água...', icon: '💧' },
  { pct: 75, text: 'Montando seu plano...', icon: '📋' },
  { pct: 90, text: 'Aquecendo...', icon: '🔥' },
  { pct: 100, text: 'Pronto pra correr!', icon: '🏃' },
];

function LoadingStep({ done }: { done: boolean }) {
  const [progress, setProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Animate progress up to 90%
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 1, 90);
        let idx = 0;
        for (let i = LOADING_PHRASES.length - 1; i >= 0; i--) {
          if (LOADING_PHRASES[i].pct <= next) { idx = i; break; }
        }
        setPhraseIndex(idx);
        if (next >= 90) clearInterval(interval);
        return next;
      });
    }, 180);
    return () => clearInterval(interval);
  }, []);

  // When API call completes, jump to 100%
  useEffect(() => {
    if (done) {
      setProgress(100);
      setPhraseIndex(LOADING_PHRASES.length - 1);
    }
  }, [done]);

  const phrase = LOADING_PHRASES[phraseIndex];

  return (
    <Animated.View entering={FadeIn.duration(500)} style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    }}>
      {/* Runner animation */}
      <View style={{ width: '100%', height: 60, position: 'relative', marginBottom: 24 }}>
        <View style={{
          position: 'absolute', bottom: 10, left: 0, right: 0,
          height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden',
        }}>
          <View style={{ height: '100%', width: `${progress}%`, borderRadius: 2, overflow: 'hidden' } as any}>
            <LinearGradient colors={['#FF6C24', '#FFAC7D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </View>
        </View>
        <Animated.View style={{
          position: 'absolute', bottom: 8,
          left: `${Math.min(progress, 88)}%`,
          marginLeft: -25,
        } as any}>
          <LottieView source={RUNNING} autoPlay loop speed={2} style={{ width: 50, height: 50 }} />
        </Animated.View>
      </View>

      {/* Percentage — centered */}
      <Text style={{
        fontFamily: FONTS.montserrat.extrabold,
        fontSize: 36,
        color: '#FF6C24',
        textAlign: 'center',
        marginBottom: 12,
      }}>{progress}%</Text>

      {/* Phrase — centered */}
      <Text style={{
        fontFamily: FONTS.montserrat.semibold,
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
      }}>{phrase.icon}  {phrase.text}</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Typewriter Text
// ══════════════════════════════════════

function TypewriterText({ text, speed = 25, style, onFinished }: { text: string; speed?: number; style?: any; onFinished?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    indexRef.current = 0;
    doneRef.current = false;
    setDisplayed('');
    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current <= text.length) {
        setDisplayed(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        if (!doneRef.current) {
          doneRef.current = true;
          onFinished?.();
        }
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <Text style={style}>{displayed}<Text style={{ color: '#FF6C24', opacity: displayed.length < text.length ? 1 : 0 }}>|</Text></Text>;
}

// ══════════════════════════════════════
// Welcome Modal (after first plan)
// ══════════════════════════════════════

function WelcomeModal({ userName, profile, welcomeMessage, onContinue }: {
  userName: string;
  profile: any;
  welcomeMessage: string | null;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [typingDone, setTypingDone] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Use AI-generated message, fallback to simple one
  const firstName = (userName || '').split(' ')[0] || 'corredor';
  const message = welcomeMessage || `Olá ${firstName}, seu plano está pronto. Confie no ritmo e qualquer dúvida me chama. Bora.`;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[s.welcomeModalOverlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient colors={['rgba(13,13,13,0.97)', 'rgba(26,16,8,0.98)', 'rgba(13,13,13,0.99)']} style={StyleSheet.absoluteFill} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.welcomeModalScroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Coach icon */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={s.welcomeModalIconWrap}>
          <View style={s.welcomeModalGlow} />
          <LottieView source={require('../../assets/personal-trainer.json')} autoPlay loop speed={0.6} style={{ width: 100, height: 100 }} />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={s.welcomeModalTitle}>Seu plano está pronto</Text>
        </Animated.View>

        {/* Typewriter message */}
        <Animated.View entering={FadeIn.delay(800).duration(400)} style={s.welcomeModalCard}>
          {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(255,108,36,0.06)', 'rgba(255,108,36,0.02)']} style={StyleSheet.absoluteFill} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,108,36,0.2)' }} />
          <TypewriterText
            text={message}
            speed={20}
            style={s.welcomeModalText}
            onFinished={() => setTypingDone(true)}
          />
        </Animated.View>

        {/* CTA: only after typing finishes */}
        {typingDone && (
          <Animated.View entering={FadeInUp.duration(500)} style={{ marginTop: 24 }}>
            <TouchableOpacity style={s.welcomeModalBtn} activeOpacity={0.85} onPress={onContinue}>
              <LinearGradient colors={['#FF6C24', '#FF8540']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Text style={s.welcomeModalBtnText}>Ver meu plano</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// Main Onboarding Screen
// ══════════════════════════════════════

export default function CoachOnboarding() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const userName = useUserStore((s) => s.profile?.name || '');
  const { setupCoach, profile: coachProfile, welcomeMessage } = useCoachStore();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [raceDistance, setRaceDistance] = useState<RaceDistance | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(['terca', 'quinta', 'sabado']);
  const [paceValue, setPaceValue] = useState(PACE_DEFAULT);
  const [unknownPace, setUnknownPace] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  const toggleDay = (d: string) => {
    setSelectedDays((prev) => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  // Steps: 0=Welcome, 1=Goal, 2=Race(conditional), 3=Days, 4=Pace, 99=Loading
  const visibleSteps = goal === 'prova' ? [1, 2, 3, 4] : [1, 3, 4];
  const totalSteps = visibleSteps.length;

  const handleNext = () => {
    if (step === 0) { setStep(1); return; }
    if (step === 1 && goal) {
      if (goal === 'prova') { setStep(2); } else { setStep(3); }
      return;
    }
    if (step === 2 && raceDistance) { setStep(3); return; }
    if (step === 3) { setStep(4); return; }
    if (step === 4) { handleSubmit(); return; }
  };

  const handleBack = () => {
    if (step === 4) { setStep(3); return; }
    if (step === 3 && goal === 'prova') { setStep(2); return; }
    if (step === 3) { setStep(1); return; }
    if (step === 2) { setStep(1); return; }
    if (step === 1) { setStep(0); return; }
    router.replace('/(tabs)/' as any);
  };

  const navigatingRef = useRef(false);

  const handleSubmit = async () => {
    if (!userId || !goal || navigatingRef.current) return;
    setStep(99);
    setLoadingDone(false);
    try {
      await setupCoach(userId, {
        goal,
        race_distance: raceDistance || undefined,
        days_per_week: selectedDays.length,
        selected_days: selectedDays,
        current_pace: unknownPace ? undefined : `${formatPace(paceValue)}/km`,
        userName,
      });
      console.log('[Onboarding] setupCoach succeeded, setting done=true');
      setLoadingDone(true);
    } catch (err: any) {
      console.error('[Onboarding] setupCoach FAILED:', err?.message || err);
      Alert.alert('Erro', err?.message || 'Não foi possível gerar seu plano. Tente novamente.');
      setStep(4);
      setLoadingDone(false);
    }
  };

  // When loading done, show welcome modal (step 100)
  useEffect(() => {
    if (loadingDone && step === 99 && !navigatingRef.current) {
      const timer = setTimeout(() => setStep(100), 800);
      return () => clearTimeout(timer);
    }
  }, [loadingDone, step]);

  const canNext = step === 0 || (step === 1 && goal) || (step === 2 && raceDistance) || (step === 3 && selectedDays.length >= 2) || step === 4;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      {step !== 0 && step !== 99 && (
        <Animated.View entering={FadeIn.duration(300)} style={s.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ChevronBack />
          </TouchableOpacity>
          {/* Progress dots */}
          <View style={s.dots}>
            {visibleSteps.map((s_num, i) => (
              <View key={i} style={[s.dot, step >= s_num && s.dotActive]} />
            ))}
          </View>
          <View style={{ width: 20 }} />
        </Animated.View>
      )}

      {/* Steps */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 0 && <WelcomeStep onNext={handleNext} onBack={() => router.replace('/(tabs)/' as any)} />}
        {step === 1 && <GoalStep selected={goal} onSelect={(g) => { setGoal(g); setTimeout(() => { if (g === 'prova') setStep(2); else setStep(3); }, 400); }} />}
        {step === 2 && <RaceStep distance={raceDistance} onSelect={(d) => { setRaceDistance(d); setTimeout(() => setStep(3), 400); }} />}
        {step === 3 && <DaysStep selectedDays={selectedDays} onToggle={toggleDay} />}
        {step === 4 && <PaceStep paceValue={paceValue} onChangePace={setPaceValue} unknownPace={unknownPace} onToggleUnknown={() => { setUnknownPace(true); handleSubmit(); }} />}
        {step === 99 && <LoadingStep done={loadingDone} />}
        {step === 100 && (
          <WelcomeModal
            userName={userName}
            profile={coachProfile}
            welcomeMessage={welcomeMessage}
            onContinue={() => {
              navigatingRef.current = true;
              router.replace('/coach' as any);
            }}
          />
        )}
      </ScrollView>

      {/* Bottom button */}
      {step === 3 && (
        <Animated.View entering={FadeInUp.duration(300)} style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={handleNext} disabled={!canNext}>
            <LinearGradient colors={['#FF6C24', '#FF8540']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Text style={s.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {step === 4 && (
        <Animated.View entering={FadeInUp.duration(300)} style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={handleNext} disabled={!canNext}>
            <LinearGradient colors={['#FF6C24', '#FF8540']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <LottieView source={require('../../assets/ai-art.json')} autoPlay loop speed={0.6} style={{ width: 50, height: 50, marginLeft: -12, marginRight: -4, marginVertical: -12 }} />
            <Text style={s.primaryBtnText}>Gerar meu plano</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ══════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  dotActive: { backgroundColor: '#FF6C24', width: 20 },

  // Step container
  stepContainer: { flex: 1, paddingTop: 20 },
  stepCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stepIcon: { width: 48, height: 48, marginBottom: 16, alignSelf: 'center', tintColor: '#FF6C24' },
  stepTitle: { fontFamily: FONTS.montserrat.bold, fontSize: 24, color: '#fff', textAlign: 'center', marginBottom: 8 },
  stepSub: { fontFamily: FONTS.montserrat.regular, fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 28, lineHeight: 20, paddingHorizontal: 10 },

  // Welcome
  welcomeIconWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  welcomeIcon: { width: 72, height: 72, tintColor: '#FF6C24' },
  welcomeGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,108,36,0.08)' },
  welcomeTitle: { fontFamily: FONTS.playfair.bold, fontSize: 32, color: '#fff', textAlign: 'center', marginBottom: 16, lineHeight: 40 },
  welcomeSub: { fontFamily: FONTS.montserrat.regular, fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },

  // Goal cards
  optionsGrid: { gap: 12 },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent',
  },
  goalCardSelected: { borderColor: 'rgba(255,108,36,0.3)' },
  goalIcon: { width: 36, height: 36, tintColor: 'rgba(255,255,255,0.5)' },
  goalLottieWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontFamily: FONTS.montserrat.semibold, fontSize: 15, color: '#fff' },
  goalSub: { fontFamily: FONTS.montserrat.regular, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  checkDot: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden' },

  // Race
  raceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  raceCard: {
    width: (SW - 72) / 2, paddingVertical: 24, borderRadius: 18,
    alignItems: 'center', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  raceCardSelected: { borderColor: 'rgba(255,108,36,0.3)', backgroundColor: 'rgba(255,108,36,0.06)' },
  raceLabel: { fontFamily: FONTS.montserrat.bold, fontSize: 22, color: '#fff' },
  raceDesc: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 },

  // Days
  daysRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  dayBtn: {
    width: 44, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  dayBtnSelected: { borderColor: 'rgba(255,108,36,0.3)' },
  dayBtnText: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  // Days count
  daysCount: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: '#FF6C24', textAlign: 'center', marginTop: 16 },

  // Pace slider
  paceDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 30 },
  paceValue: { fontFamily: FONTS.montserrat.extrabold, fontSize: 52, color: '#FF6C24' },
  paceUnit: { fontFamily: FONTS.montserrat.semibold, fontSize: 18, color: 'rgba(255,255,255,0.3)', marginLeft: 4 },
  sliderWrap: { position: 'relative', height: 50, marginHorizontal: 20, marginBottom: 8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderLabel: { fontFamily: FONTS.montserrat.regular, fontSize: 10, color: 'rgba(255,255,255,0.2)' },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 3, overflow: 'hidden' } as any,
  sliderRunner: { position: 'absolute', top: -14, marginLeft: -20 } as any,
  sliderTouchArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as any,
  paceSpeedLabels: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 24 } as any,
  paceSpeedLabel: { fontFamily: FONTS.montserrat.regular, fontSize: 11, color: 'rgba(255,255,255,0.2)' },
  unknownBtn: {
    alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  } as any,
  unknownBtnActive: { borderColor: 'rgba(255,108,36,0.3)' },
  unknownBtnText: { fontFamily: FONTS.montserrat.semibold, fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  // Loading
  loadingRunnerWrap: { width: '100%', height: 60, position: 'relative', marginBottom: 20, paddingHorizontal: 20 },
  loadingTrack: { position: 'absolute', bottom: 10, left: 20, right: 20, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  loadingTrackFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  loadingRunner: { position: 'absolute', bottom: 8 },
  loadingPct: { fontFamily: FONTS.montserrat.extrabold, fontSize: 36, color: '#FF6C24', marginBottom: 12, textAlign: 'center' },
  loadingPhrase: { fontFamily: FONTS.montserrat.semibold, fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  // Buttons
  primaryBtn: {
    flexDirection: 'row', height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginHorizontal: 20, marginBottom: 16,
    shadowColor: '#FF6C24', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { fontFamily: FONTS.montserrat.bold, fontSize: 15, color: '#fff' },
  bottomBar: { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 },

  // Welcome modal
  welcomeModalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 200, paddingHorizontal: 20 },
  welcomeModalScroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  welcomeModalIconWrap: { alignSelf: 'center', marginBottom: 24, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  welcomeModalGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,108,36,0.1)' },
  welcomeModalTitle: { fontFamily: FONTS.playfair.bold, fontSize: 28, color: '#fff', textAlign: 'center', marginBottom: 24 },
  welcomeModalCard: { borderRadius: 24, overflow: 'hidden', padding: 24, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)', backgroundColor: isWeb ? 'rgba(255,255,255,0.04)' : 'transparent' },
  welcomeModalText: { fontFamily: FONTS.montserrat.regular, fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 24 },
  welcomeModalBtn: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#FF6C24', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  welcomeModalBtnText: { fontFamily: FONTS.montserrat.bold, fontSize: 16, color: '#fff' },
});

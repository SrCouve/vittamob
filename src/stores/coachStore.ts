import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  COACH_SYSTEM_PROMPT,
  type CoachResponse,
  type WeeklyPlan,
  type WeeklyReview,
  type DayPlan,
  type GoalType,
  type RaceDistance,
} from '../lib/coach-prompt';

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

interface CoachProfile {
  goal: GoalType;
  race_distance?: RaceDistance;
  race_date?: string;
  days_per_week: number;
  selected_days?: string[];
  current_pace_seconds?: number;
  injury_history?: string;
  level: string;
  vdot: number;
  zones: any;
  plan_total_weeks: number;
  plan_current_week: number;
  plan_phase: string;
  goal_message?: string;
  predicted_5k?: string;
  predicted_10k?: string;
  predicted_21k?: string;
  consecutive_build_weeks: number;
  last_deload_week: number;
  welcome_message?: string;
}

interface WorkoutLogEntry {
  day_of_week: string;
  prescribed_type?: string;
  prescribed_distance_km?: number;
  actual_distance_km?: number;
  actual_pace?: string;
  rpe?: number;
  status: 'completed' | 'skipped' | 'pending';
  feedback_note?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/** A Strava run that was auto-matched to a prescribed workout */
export interface DetectedRun {
  day: string;           // day name (segunda, terca, etc.)
  prescribedType: string;
  prescribedTitle: string;
  prescribedDistance?: number;
  actualDistance: number;
  actualPace: string;    // formatted "M:SS/km"
  actualTimeSeconds: number;
  stravaDate: string;
  needsRPE: boolean;     // true = user hasn't rated yet
}

interface CoachState {
  profile: CoachProfile | null;
  currentPlan: WeeklyPlan | null;
  todayWorkout: DayPlan | null;
  weekLog: WorkoutLogEntry[];
  detectedRuns: DetectedRun[];  // Strava runs matched to workouts awaiting RPE
  lastReview: WeeklyReview | null;
  messages: ChatMessage[];
  welcomeMessage: string | null;
  isLoading: boolean;
  isGenerating: boolean;
  hasCoach: boolean;
  needsReview: boolean;

  // Actions
  fetchCoachProfile: (userId: string) => Promise<void>;
  fetchWeekLog: (userId: string) => Promise<void>;
  syncStravaWithCoach: (userId: string) => Promise<void>;
  confirmDetectedRun: (userId: string, dayOfWeek: string, rpe: number) => Promise<void>;
  setupCoach: (userId: string, data: {
    goal: GoalType;
    race_distance?: RaceDistance;
    race_date?: string;
    days_per_week: number;
    selected_days: string[];
    current_pace?: string;
    injury_history?: string;
    userName?: string;
  }) => Promise<void>;
  generateNextWeek: (userId: string) => Promise<void>;
  fetchCurrentPlan: (userId: string) => Promise<void>;
  logWorkout: (userId: string, dayOfWeek: string, rpe: number, status: 'completed' | 'skipped', note?: string) => Promise<void>;
  sendMessage: (userId: string, message: string) => Promise<string>;
  fetchMessages: (userId: string) => Promise<void>;
  resetCoach: (userId: string) => Promise<void>;
  reset: () => void;
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/** Call Claude via edge function */
async function callClaude(systemPrompt: string, userMessage: string, mode: 'plan' | 'chat' = 'plan'): Promise<any> {
  console.log('[Coach] Calling edge function...', { mode, msgLen: userMessage.length });
  const { data, error } = await supabase.functions.invoke('coach-ai', {
    body: { system: systemPrompt, message: userMessage, mode },
  });

  if (error) throw new Error(`Coach AI error: ${error.message}`);
  if (!data) throw new Error('Coach AI returned null data');
  if (data.error) throw new Error(`Coach AI: ${data.error}${data.details ? ' — ' + data.details : ''}`);
  if (!data.response) throw new Error('Coach AI returned empty response');

  // If already parsed JSON object
  if (typeof data.response === 'object') return data.response;

  // Try to parse string
  const raw = String(data.response);
  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first !== -1 && last > first) {
      return JSON.parse(raw.substring(first, last + 1));
    }
    throw new Error('Coach AI returned invalid JSON: ' + raw.substring(0, 100));
  }
}

/** Format seconds to pace string (e.g. 390 → "6:30") */
function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

/**
 * Calculate VDOT from a race/run performance using Jack Daniels formula.
 * Uses the best recent effort (fastest pace on a run >= 3km) to estimate.
 * Returns VDOT integer (typical range: 20-80)
 */
function calculateVDOT(runs: { distance_km: number; moving_time_seconds: number }[]): number {
  if (runs.length === 0) return 0;

  // Find the best effort: fastest pace on runs >= 3km (meaningful distance)
  const validRuns = runs.filter(r => r.distance_km >= 3 && r.moving_time_seconds > 0);
  if (validRuns.length === 0) return 0;

  // Best effort = lowest time per km
  const bestRun = validRuns.reduce((best, r) => {
    const pace = r.moving_time_seconds / r.distance_km;
    const bestPace = best.moving_time_seconds / best.distance_km;
    return pace < bestPace ? r : best;
  });

  const distMeters = bestRun.distance_km * 1000;
  const timeSecs = bestRun.moving_time_seconds;
  const timeMin = timeSecs / 60;

  // Daniels VO2 formula: VO2 = -4.6 + 0.182258*(dist/time) + 0.000104*(dist/time)^2
  // where dist is meters and time is minutes
  const velocity = distMeters / timeMin; // meters per minute
  const pctVO2 = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 0.2989558 * Math.exp(-0.1932605 * timeMin);
  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
  const vdot = Math.round(vo2 / pctVO2);

  // Clamp to reasonable range
  return Math.max(15, Math.min(85, vdot));
}

/**
 * Predict race times from VDOT using Riegel formula with recreational adjustment.
 */
function predictTimes(vdot: number, bestRun: { distance_km: number; moving_time_seconds: number }): {
  predicted_5k: string; predicted_10k: string; predicted_21k: string;
} {
  const fmt = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Riegel: T2 = T1 * (D2/D1)^1.06, adjusted +4% for recreational
  const d1 = bestRun.distance_km;
  const t1 = bestRun.moving_time_seconds;
  const predict = (targetKm: number) => t1 * Math.pow(targetKm / d1, 1.06) * 1.04;

  return {
    predicted_5k: fmt(predict(5)),
    predicted_10k: fmt(predict(10)),
    predicted_21k: fmt(predict(21.1)),
  };
}

/** Get today's day name in Portuguese */
function getTodayName(): string {
  return ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][new Date().getDay()];
}

/** Determine if we need a weekly review (all training days passed) */
function checkNeedsReview(plan: WeeklyPlan | null, log: WorkoutLogEntry[]): boolean {
  if (!plan?.days) return false;
  const trainingDays = plan.days.filter(d => d.type !== 'descanso');
  if (trainingDays.length === 0) return false;

  // Check if we're past the last training day of the week
  const todayIdx = new Date().getDay();
  const dayOrder = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const lastTrainingDay = trainingDays[trainingDays.length - 1]?.day;
  const lastTrainingIdx = dayOrder.indexOf(lastTrainingDay || '');

  // If today is Sunday or past last training day, and we have at least some logs
  return todayIdx === 0 || (lastTrainingIdx >= 0 && todayIdx > lastTrainingIdx);
}

// ══════════════════════════════════════════════════════════════
// Store
// ══════════════════════════════════════════════════════════════

export const useCoachStore = create<CoachState>((set, get) => ({
  profile: null,
  currentPlan: null,
  todayWorkout: null,
  weekLog: [],
  detectedRuns: [],
  welcomeMessage: null,
  lastReview: null,
  messages: [],
  isLoading: false,
  isGenerating: false,
  hasCoach: false,
  needsReview: false,

  reset: () => set({
    profile: null, currentPlan: null, todayWorkout: null, weekLog: [], detectedRuns: [],
    welcomeMessage: null, lastReview: null, messages: [],
    isLoading: false, isGenerating: false, hasCoach: false, needsReview: false,
  }),

  // ── Sync Strava runs with Coach workouts ──
  syncStravaWithCoach: async (userId) => {
    const plan = get().currentPlan;
    if (!plan?.days) return;

    // Get this week's date range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Fetch Strava runs this week
    const { data: stravaRuns } = await supabase
      .from('strava_awarded_runs')
      .select('activity_date, distance_km, moving_time_seconds, average_speed')
      .eq('user_id', userId)
      .gte('activity_date', weekStart.toISOString().split('T')[0])
      .lt('activity_date', weekEnd.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (!stravaRuns?.length) return;

    // Fetch existing workout logs this week (to avoid duplicates)
    const { data: existingLogs } = await supabase
      .from('coach_workout_log')
      .select('day_of_week, status')
      .eq('user_id', userId)
      .gte('completed_at', weekStart.toISOString());

    const loggedDays = new Set((existingLogs || []).map(l => l.day_of_week));

    // Map Strava run dates to day names
    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    const detected: DetectedRun[] = [];

    for (const run of stravaRuns) {
      const runDate = new Date(run.activity_date + 'T12:00:00');
      const runDayName = dayNames[runDate.getDay()];

      // Find matching prescribed workout for this day
      const prescribed = plan.days.find(d => d.day === runDayName && d.type !== 'descanso');
      if (!prescribed) continue;

      // Skip if already logged
      if (loggedDays.has(runDayName)) continue;

      // Calculate pace
      const paceSecsPerKm = run.distance_km > 0 ? run.moving_time_seconds / run.distance_km : 0;
      const paceFormatted = paceSecsPerKm > 0 ? formatPace(paceSecsPerKm) : '--:--';

      // Auto-insert into workout log with status 'completed' but rpe=0 (needs confirmation)
      const { error } = await supabase.from('coach_workout_log').insert({
        user_id: userId,
        day_of_week: runDayName,
        prescribed_type: prescribed.type,
        prescribed_distance_km: prescribed.distance_km || null,
        prescribed_pace: prescribed.pace_target || null,
        actual_distance_km: Number(run.distance_km),
        actual_pace: `${paceFormatted}/km`,
        actual_time_seconds: run.moving_time_seconds,
        rpe: 0, // 0 = needs RPE from user
        status: 'completed',
        completed_at: run.activity_date,
      });

      if (!error) {
        loggedDays.add(runDayName);
        detected.push({
          day: runDayName,
          prescribedType: prescribed.type,
          prescribedTitle: prescribed.title || prescribed.type,
          prescribedDistance: prescribed.distance_km,
          actualDistance: Number(run.distance_km),
          actualPace: `${paceFormatted}/km`,
          actualTimeSeconds: run.moving_time_seconds,
          stravaDate: run.activity_date,
          needsRPE: true,
        });
      }
    }

    // Also check for existing auto-logged runs that still need RPE (rpe=0)
    const { data: pendingRPE } = await supabase
      .from('coach_workout_log')
      .select('day_of_week, prescribed_type, prescribed_distance_km, actual_distance_km, actual_pace, actual_time_seconds')
      .eq('user_id', userId)
      .eq('rpe', 0)
      .eq('status', 'completed')
      .gte('completed_at', weekStart.toISOString().split('T')[0]);

    // Build detected list from pending RPE entries (if not already in detected)
    const detectedDays = new Set(detected.map(d => d.day));
    for (const log of (pendingRPE || [])) {
      if (detectedDays.has(log.day_of_week)) continue;
      const prescribed = plan.days.find(d => d.day === log.day_of_week);
      const paceStr = log.actual_pace || '--:--/km';
      detected.push({
        day: log.day_of_week,
        prescribedType: log.prescribed_type || 'easy',
        prescribedTitle: prescribed?.title || log.prescribed_type || 'Treino',
        prescribedDistance: log.prescribed_distance_km || undefined,
        actualDistance: Number(log.actual_distance_km || 0),
        actualPace: paceStr,
        actualTimeSeconds: log.actual_time_seconds || 0,
        stravaDate: '',
        needsRPE: true,
      });
    }

    set({ detectedRuns: detected });
    get().fetchWeekLog(userId);
  },

  // ── Confirm RPE for auto-detected run ──
  confirmDetectedRun: async (userId, dayOfWeek, rpe) => {
    // Update the workout log entry that has rpe=0 for this day
    await supabase
      .from('coach_workout_log')
      .update({ rpe })
      .eq('user_id', userId)
      .eq('day_of_week', dayOfWeek)
      .eq('rpe', 0); // only update unconfirmed ones

    // Remove from detected list
    set({
      detectedRuns: get().detectedRuns.filter(d => d.day !== dayOfWeek),
    });

    // Refresh
    get().fetchWeekLog(userId);
  },

  // ── Fetch Profile ──
  fetchCoachProfile: async (userId) => {
    const { data } = await supabase
      .from('coach_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      set({ profile: data as any, hasCoach: true });
    } else {
      set({ hasCoach: false });
    }
  },

  // ── Fetch Week Log ──
  fetchWeekLog: async (userId) => {
    // Monday-based week (consistent with syncStravaWithCoach)
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('coach_workout_log')
      .select('day_of_week, prescribed_type, prescribed_distance_km, actual_distance_km, actual_pace, rpe, status, feedback_note')
      .eq('user_id', userId)
      .gte('completed_at', weekStart.toISOString());

    const log = (data as WorkoutLogEntry[]) || [];
    const plan = get().currentPlan;
    set({
      weekLog: log,
      needsReview: checkNeedsReview(plan, log),
    });
  },

  // ── Setup Coach (Onboarding → First Plan) ──
  setupCoach: async (userId, setupData) => {
    set({ isLoading: true });

    // Get recent runs for assessment
    const { data: runs } = await supabase
      .from('strava_awarded_runs')
      .select('activity_date, distance_km, moving_time_seconds')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(30);

    // Build run stats
    const recentRuns = (runs || []).filter((r: any) => r.distance_km > 0).map((r: any) => {
      const paceSecsPerKm = r.moving_time_seconds / r.distance_km;
      return {
        date: r.activity_date,
        distance_km: Number(r.distance_km.toFixed(1)),
        moving_time_seconds: r.moving_time_seconds,
        pace: formatPace(paceSecsPerKm),
      };
    });

    const totalRuns = recentRuns.length;
    const totalKm = recentRuns.reduce((s: number, r: any) => s + r.distance_km, 0);
    const avgPaceSeconds = totalRuns > 0
      ? recentRuns.reduce((s: number, r: any) => s + (r.moving_time_seconds / r.distance_km), 0) / totalRuns
      : 0;
    const longestRun = totalRuns > 0 ? Math.max(...recentRuns.map((r: any) => r.distance_km)) : 0;

    // Weekly averages (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const last4Runs = recentRuns.filter((r: any) => new Date(r.date) >= fourWeeksAgo);
    const weeklyAvgKm = last4Runs.length > 0 ? (last4Runs.reduce((s: number, r: any) => s + r.distance_km, 0) / 4) : 0;
    const weeklyAvgRuns = last4Runs.length > 0 ? (last4Runs.length / 4) : 0;

    // Calculate VDOT with real formula (not AI guessing)
    const runsForVdot = (runs || []).filter((r: any) => r.distance_km >= 3 && r.moving_time_seconds > 0);
    const calculatedVdot = calculateVDOT(runsForVdot);
    const bestEffort = runsForVdot.length > 0
      ? runsForVdot.reduce((best: any, r: any) => {
          const pace = r.moving_time_seconds / r.distance_km;
          const bestPace = best.moving_time_seconds / best.distance_km;
          return pace < bestPace ? r : best;
        })
      : null;
    const predictions = bestEffort ? predictTimes(calculatedVdot, bestEffort) : null;

    const userMessage = `SETUP INICIAL: Novo corredor para avaliar e criar plano da Semana 1.

DADOS DO CORREDOR:
- Nome: ${setupData.userName || 'Corredor'}
- Objetivo: ${setupData.goal}${setupData.race_distance ? ` (${setupData.race_distance})` : ''}${setupData.race_date ? ` em ${setupData.race_date}` : ''}
- Dias disponíveis: ${setupData.days_per_week}x/semana
- Dias selecionados: ${setupData.selected_days.join(', ')}
- Pace atual informado: ${setupData.current_pace || 'Não informado'}
- Histórico de lesão: ${setupData.injury_history || 'Nenhum'}

HISTÓRICO DE CORRIDAS (últimas ${totalRuns} corridas):
${JSON.stringify(recentRuns.slice(0, 20), null, 2)}

ESTATÍSTICAS:
- Total de corridas recentes: ${totalRuns}
- Km total: ${totalKm.toFixed(1)}km
- Pace médio: ${avgPaceSeconds > 0 ? formatPace(avgPaceSeconds) + '/km' : 'Sem dados'}
- Maior corrida: ${longestRun.toFixed(1)}km
- Volume semanal médio (4 sem): ${weeklyAvgKm.toFixed(1)}km
- Frequência média (4 sem): ${weeklyAvgRuns.toFixed(1)} corridas/sem

VDOT CALCULADO (fórmula Daniels, NÃO altere): ${calculatedVdot}
${predictions ? `TEMPOS PREVISTOS (Riegel +4% recreativo, NÃO altere): 5K ${predictions.predicted_5k} | 10K ${predictions.predicted_10k} | 21K ${predictions.predicted_21k}` : ''}
USE EXATAMENTE esses valores de VDOT e tempos previstos no campo assessment. Não recalcule.

INSTRUÇÕES:
1. Faça a avaliação completa (level, VDOT, zonas, predicted_5k/10k/21k)
2. Gere o plano da SEMANA 1 com TODOS os 7 dias (${setupData.selected_days.join(', ')} = treino, resto = descanso)
3. Cada dia DEVE ter title, objective, feel, session_goal e tip preenchidos
4. Paces baseados nos dados REAIS acima
5. Inclua goal_message com meta específica
6. Retorne APENAS JSON válido`;

    try {
      const parsed: CoachResponse = await callClaude(COACH_SYSTEM_PROMPT, userMessage);

      if (!parsed.assessment && !parsed.plan) {
        throw new Error('AI retornou resposta sem assessment nem plan');
      }

      // Delete old data and insert fresh
      await supabase.from('coach_profiles').delete().eq('user_id', userId);
      await supabase.from('coach_weekly_plans').delete().eq('user_id', userId);
      await supabase.from('coach_workout_log').delete().eq('user_id', userId);
      await supabase.from('coach_messages').delete().eq('user_id', userId);
      await supabase.from('coach_weekly_summaries').delete().eq('user_id', userId);

      const profileData: Record<string, any> = {
        user_id: userId,
        goal: setupData.goal,
        race_distance: setupData.race_distance || null,
        race_date: setupData.race_date || null,
        days_per_week: setupData.days_per_week,
        injury_history: setupData.injury_history || null,
        level: parsed.assessment?.level || 'iniciante',
        vdot: calculatedVdot || parsed.assessment?.vdot || 0,
        zones: parsed.assessment?.zones || null,
        plan_total_weeks: parsed.plan?.total_weeks || 12,
        plan_current_week: 1,
        plan_phase: parsed.plan?.phase || 'base',
        goal_message: parsed.goal_message || null,
        predicted_5k: predictions?.predicted_5k || parsed.assessment?.predicted_5k || null,
        predicted_10k: predictions?.predicted_10k || parsed.assessment?.predicted_10k || null,
      };

      // New columns — only include if migration has been applied
      // These will silently fail if columns don't exist yet
      try {
        const { error: colCheck } = await supabase.from('coach_profiles').select('selected_days').limit(0);
        if (!colCheck) {
          profileData.selected_days = setupData.selected_days;
          profileData.predicted_21k = predictions?.predicted_21k || parsed.assessment?.predicted_21k || null;
          profileData.consecutive_build_weeks = 0;
          profileData.last_deload_week = 0;
        }
      } catch { /* columns don't exist yet, skip */ }

      const { error: profileError } = await supabase.from('coach_profiles').insert(profileData);
      if (profileError) throw new Error('Erro ao salvar perfil: ' + profileError.message);

      // Save week 1 plan
      if (parsed.plan) {
        const { error: planError } = await supabase.from('coach_weekly_plans').insert({
          user_id: userId,
          week_number: 1,
          phase: parsed.plan.phase,
          volume_target_km: parsed.plan.weekly_volume_km || 0,
          days: parsed.plan.days,
          ai_notes: parsed.plan.weekly_note || null,
          weekly_meta: parsed.plan.weekly_meta || parsed.weekly_meta || null,
        });
        if (planError) throw new Error('Erro ao salvar plano: ' + planError.message);
      }

      // Update state
      const today = getTodayName();
      const todayPlan = parsed.plan?.days.find(d => d.day === today) || null;

      set({
        profile: profileData as any,
        currentPlan: parsed.plan || null,
        todayWorkout: todayPlan,
        welcomeMessage: parsed.welcome_message || null,
        hasCoach: true,
        isLoading: false,
        needsReview: false,
      });

    } catch (e: any) {
      console.error('[Coach] setupCoach FAILED:', e?.message || e);
      set({ isLoading: false });
      throw e;
    }
  },

  // ── Generate Next Week (Review + Plan) ──
  generateNextWeek: async (userId) => {
    set({ isGenerating: true });

    try {
      // Get full context from RPC
      const { data: context, error: ctxError } = await supabase.rpc('get_coach_context', { p_user_id: userId });
      if (ctxError) throw new Error('Erro ao buscar contexto: ' + ctxError.message);

      const profile = get().profile;
      const currentWeek = profile?.plan_current_week || 1;
      const nextWeek = currentWeek + 1;
      const selectedDays = profile?.selected_days || ['terca', 'quinta', 'sabado'];

      // Determine if deload is needed
      const buildWeeks = profile?.consecutive_build_weeks || 0;
      const forceDeload = buildWeeks >= 3;

      const userMessage = `AVALIAÇÃO SEMANAL + PLANO DA SEMANA ${nextWeek}

CONTEXTO COMPLETO DO CORREDOR:
${JSON.stringify(context, null, 2)}

DIAS SELECIONADOS PARA TREINAR: ${selectedDays.join(', ')}
SEMANA ATUAL: ${currentWeek} de ${profile?.plan_total_weeks || 12}
FASE ATUAL: ${profile?.plan_phase || 'base'}
SEMANAS CONSECUTIVAS DE BUILD: ${buildWeeks}
${forceDeload ? '⚠️ ATENÇÃO: 3 semanas de build completadas. Esta DEVE ser semana de CUTBACK (60-67% do volume).' : ''}
${profile?.race_date ? `CORRIDA EM: ${profile.race_date}` : ''}

INSTRUÇÕES:
1. PRIMEIRO: Analise a semana ${currentWeek} — compliance, RPE, pace, volume, fadiga
2. Gere o objeto "review" com a análise completa
3. DEPOIS: Baseado na análise, gere o plano da semana ${nextWeek}
4. TODOS os 7 dias devem estar no array "days" (treino nos dias selecionados, descanso nos outros)
5. Cada dia com title, objective, feel, session_goal, tip preenchidos
6. Se compliance < 60% → reduzir volume 15-20%
7. Se RPE médio > 7 → considerar deload
8. Se pace mais rápido → considerar upgrade de VDOT
9. Aplicar progressão 3:1 (build/cutback)
10. Retorne JSON com "review" + "plan"`;

      const parsed: CoachResponse = await callClaude(COACH_SYSTEM_PROMPT, userMessage);

      if (!parsed.plan) throw new Error('AI não retornou plano');

      // Save review if present
      const review = parsed.review || null;
      set({ lastReview: review });

      // Save the plan
      const { error: planError } = await supabase.from('coach_weekly_plans').insert({
        user_id: userId,
        week_number: nextWeek,
        phase: parsed.plan.phase,
        volume_target_km: parsed.plan.weekly_volume_km,
        days: parsed.plan.days,
        ai_notes: parsed.plan.weekly_note || null,
        weekly_meta: parsed.plan.weekly_meta || parsed.weekly_meta || null,
        weekly_review: review,
      });
      if (planError) throw new Error('Erro ao salvar plano: ' + planError.message);

      // Save weekly summary
      if (review) {
        await supabase.from('coach_weekly_summaries').insert({
          user_id: userId,
          week_number: currentWeek,
          volume_target_km: review.volume_prescribed_km,
          volume_done_km: review.volume_completed_km,
          completion_pct: review.compliance_pct,
          workouts_done: Math.round((review.compliance_pct / 100) * (profile?.days_per_week || 3)),
          workouts_total: profile?.days_per_week || 3,
          avg_rpe: review.avg_rpe,
          pace_trend: review.pace_adherence === 'too_fast' ? 'improving' : review.pace_adherence === 'too_slow' ? 'declining' : 'stable',
          message: review.coach_analysis,
        });
      }

      // Update profile
      const isDeload = parsed.plan.phase === 'recuperacao' || (review?.adjustment === 'deload');
      const newBuildWeeks = isDeload ? 0 : buildWeeks + 1;

      await supabase.from('coach_profiles').update({
        plan_current_week: nextWeek,
        plan_phase: parsed.plan.phase,
        consecutive_build_weeks: newBuildWeeks,
        last_deload_week: isDeload ? nextWeek : (profile?.last_deload_week || 0),
        // Update VDOT if review suggests it
        ...(review?.vdot_update ? { vdot: review.vdot_update } : {}),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);

      // Update state
      const today = getTodayName();
      const todayPlan = parsed.plan.days.find(d => d.day === today) || null;

      set({
        currentPlan: parsed.plan,
        todayWorkout: todayPlan,
        profile: {
          ...profile!,
          plan_current_week: nextWeek,
          plan_phase: parsed.plan.phase,
          consecutive_build_weeks: newBuildWeeks,
        },
        isGenerating: false,
        needsReview: false,
      });

    } catch (e: any) {
      console.error('[Coach] generateNextWeek FAILED:', e?.message || e);
      set({ isGenerating: false });
      throw e;
    }
  },

  // ── Fetch Current Plan ──
  fetchCurrentPlan: async (userId) => {
    const { data } = await supabase
      .from('coach_weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const plan: WeeklyPlan = {
        total_weeks: get().profile?.plan_total_weeks || 12,
        current_week: data.week_number,
        phase: data.phase,
        weekly_volume_km: data.volume_target_km,
        weekly_note: data.ai_notes || undefined,
        weekly_meta: data.weekly_meta || undefined,
        days: data.days as DayPlan[],
      };
      set({
        currentPlan: plan,
        lastReview: data.weekly_review || null,
      });

      // Set today's workout
      const today = getTodayName();
      const todayPlan = plan.days.find(d => d.day === today) || null;
      set({ todayWorkout: todayPlan });
    }
  },

  // ── Log Workout ──
  logWorkout: async (userId, dayOfWeek, rpe, status, note) => {
    try {
      const plan = get().currentPlan;
      const dayPlan = plan?.days.find(d => d.day === dayOfWeek);

      await supabase.from('coach_workout_log').insert({
        user_id: userId,
        day_of_week: dayOfWeek,
        prescribed_type: dayPlan?.type || null,
        prescribed_distance_km: dayPlan?.distance_km || null,
        prescribed_pace: dayPlan?.pace_target || null,
        rpe,
        status,
        feedback_note: note || null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      });

      // Refresh week log
      get().fetchWeekLog(userId);
    } catch (e) {
      console.error('logWorkout error:', e);
    }
  },

  // ── Send Chat Message ──
  sendMessage: async (userId, message) => {
    // ── Rate limit: max 3 messages per day ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', todayStart.toISOString());

    if ((count ?? 0) >= 3) {
      const newMessages = [
        ...get().messages,
        { id: Date.now().toString(), role: 'user' as const, content: message, created_at: new Date().toISOString() },
        { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: 'Você já usou suas 3 mensagens de hoje. Amanhã posso te ajudar de novo. Enquanto isso, foca no treino do dia!', created_at: new Date().toISOString() },
      ];
      set({ messages: newMessages });
      return 'Limite diário atingido.';
    }

    // ── Sanitize: limit length, strip potential injection ──
    let cleanMsg = message.slice(0, 500).trim();
    // Remove attempts to override system prompt
    cleanMsg = cleanMsg
      .replace(/system:|assistant:|SYSTEM:|ASSISTANT:/gi, '')
      .replace(/ignore.*instructions|forget.*rules|you are now/gi, '')
      .replace(/```/g, '');

    if (!cleanMsg) return 'Mensagem vazia.';

    set({ isGenerating: true });

    // Save user message
    await supabase.from('coach_messages').insert({
      user_id: userId,
      role: 'user',
      content: cleanMsg,
    });

    // Get context
    const { data: context } = await supabase.rpc('get_coach_context', { p_user_id: userId });

    // Recent chat history (last 6 to save tokens)
    const { data: history } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);

    const chatHistory = (history || []).reverse().map((m: any) => `${m.role}: ${m.content}`).join('\n');

    const userMessage = `MODO CHAT: Responda em texto natural (não JSON de plano).

CONTEXTO DO CORREDOR:
${JSON.stringify(context)}

HISTÓRICO DE CHAT:
${chatHistory}

MENSAGEM DO CORREDOR:
${cleanMsg}

Responda curto, direto, útil. Máximo 3 parágrafos. Retorne JSON: { "chat_response": "..." }`;

    try {
      const rawResponse = await callClaude(COACH_SYSTEM_PROMPT, userMessage, 'chat');
      const responseText = typeof rawResponse === 'string'
        ? rawResponse
        : (rawResponse?.chat_response || JSON.stringify(rawResponse));

      // Save assistant message
      await supabase.from('coach_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: responseText,
      });

      const newMessages = [
        ...get().messages,
        { id: Date.now().toString(), role: 'user' as const, content: message, created_at: new Date().toISOString() },
        { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: responseText, created_at: new Date().toISOString() },
      ];
      set({ messages: newMessages, isGenerating: false });
      return responseText;
    } catch (e) {
      console.error('sendMessage error:', e);
      set({ isGenerating: false });
      return 'Desculpa, tive um problema. Tenta de novo.';
    }
  },

  // ── Fetch Messages ──
  fetchMessages: async (userId) => {
    const { data } = await supabase
      .from('coach_messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) set({ messages: data as ChatMessage[] });
  },

  // ── Reset Coach ──
  resetCoach: async (userId) => {
    await supabase.from('coach_profiles').delete().eq('user_id', userId);
    await supabase.from('coach_weekly_plans').delete().eq('user_id', userId);
    await supabase.from('coach_workout_log').delete().eq('user_id', userId);
    await supabase.from('coach_messages').delete().eq('user_id', userId);
    await supabase.from('coach_weekly_summaries').delete().eq('user_id', userId);
    set({
      profile: null,
      currentPlan: null,
      todayWorkout: null,
      weekLog: [],
      detectedRuns: [],
      lastReview: null,
      messages: [],
      hasCoach: false,
      needsReview: false,
    });
  },
}));

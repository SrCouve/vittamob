import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Update widget when stats change
let updateWidget: ((data: { currentKm: number; goalKm: number; progressPercent: number }) => void) | null = null;
try {
  const MetaSemanal = require('../../widgets/MetaSemanal').default;
  updateWidget = (data) => {
    MetaSemanal.updateSnapshot({
      ...data,
      dayLabels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      dayValues: [0, 0, 0, 0, 0, 0, 0],
    });
  };
} catch {};

// ── Strava Config ──
// Replace with your Strava app credentials
export const STRAVA_CLIENT_ID = '211109';

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize';

// Min 5 min between syncs
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

// ── Types ──
interface StravaConnection {
  id: string;
  user_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_firstname: string | null;
  athlete_lastname: string | null;
  athlete_profile_url: string | null;
}

interface MonthlyKm {
  month: string;
  km: number;
}

export interface StravaRun {
  id: string;
  strava_activity_id: number;
  activity_name: string;
  activity_date: string;
  distance_km: number;
  moving_time_seconds: number;
  average_speed: number;
  sparks_awarded: number;
}

interface StravaState {
  // Connection
  isConnected: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  connection: StravaConnection | null;

  // Weekly stats
  weeklyKm: number[];
  weeklyTotal: number;
  weeklyGoal: number;

  // Lifetime stats
  lifetimeDistanceKm: number;
  lifetimeRunCount: number;
  lifetimeMovingTimeHours: number;
  lifetimeElevationM: number;
  avgPace: string;
  monthlyKm: MonthlyKm[];
  lastSyncedAt: string | null;

  // Runs
  runs: StravaRun[];
  isLoadingRuns: boolean;
  totalSparksEarned: number;

  // Actions
  checkConnection: (userId: string) => Promise<void>;
  connectStrava: (code: string, userId: string) => Promise<{ error: string | null }>;
  disconnectStrava: () => Promise<void>;
  syncAllStats: () => Promise<void>;
  syncWeeklyStats: () => Promise<void>;
  syncLifetimeStats: () => Promise<void>;
  setWeeklyGoal: (km: number) => Promise<void>;
  fetchRuns: (userId: string) => Promise<void>;
  syncAndAwardRuns: (userId: string) => Promise<void>;
}

// ── Helpers ──
function getWeekStartEpoch(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}

function speedToPace(mps: number): string {
  if (mps === 0) return '0:00';
  const paceSeconds = 1000 / mps;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getMonthAbbr(date: Date): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[date.getMonth()];
}

// ── Store ──
export const useStravaStore = create<StravaState>((set, get) => ({
  isConnected: false,
  isLoading: false,
  isSyncing: false,
  connection: null,

  weeklyKm: [0, 0, 0, 0, 0, 0, 0],
  weeklyTotal: 0,
  weeklyGoal: 20,

  lifetimeDistanceKm: 0,
  lifetimeRunCount: 0,
  lifetimeMovingTimeHours: 0,
  lifetimeElevationM: 0,
  avgPace: '0:00',
  monthlyKm: [],
  lastSyncedAt: null,

  runs: [],
  isLoadingRuns: false,
  totalSparksEarned: 0,

  // ── Check if user has Strava connected ──
  checkConnection: async (userId) => {
    set({ isLoading: true });

    const { data: conn } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (conn) {
      set({ isConnected: true, connection: conn as StravaConnection });

      // Load cached stats
      const { data: stats } = await supabase
        .from('strava_stats_cache')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (stats) {
        set({
          weeklyKm: (stats.weekly_km as number[]) || [0, 0, 0, 0, 0, 0, 0],
          weeklyTotal: stats.weekly_total_km || 0,
          weeklyGoal: stats.weekly_goal_km || 20,
          lifetimeDistanceKm: (stats.lifetime_distance_m || 0) / 1000,
          lifetimeRunCount: stats.lifetime_run_count || 0,
          lifetimeMovingTimeHours: Math.round((stats.lifetime_moving_time_s || 0) / 3600),
          lifetimeElevationM: stats.lifetime_elevation_m || 0,
          avgPace: stats.avg_pace_mps ? speedToPace(stats.avg_pace_mps) : '0:00',
          monthlyKm: (stats.monthly_km as MonthlyKm[]) || [],
          lastSyncedAt: stats.last_synced_at,
        });

        // Update widget with cached data
        const wTotal = stats.weekly_total_km || 0;
        const wGoal = stats.weekly_goal_km || 20;
        updateWidget?.({
          currentKm: wTotal,
          goalKm: wGoal,
          progressPercent: wGoal > 0 ? Math.min((wTotal / wGoal) * 100, 100) : 0,
        });
      }
    }

    set({ isLoading: false });
  },

  // ── Exchange OAuth code for tokens ──
  connectStrava: async (code, userId) => {
    set({ isLoading: true });

    try {
      // Call Supabase Edge Function to exchange code (keeps client_secret server-side)
      const { data, error } = await supabase.functions.invoke('strava-auth', {
        body: { action: 'exchange', code, user_id: userId },
      });

      if (error || !data) {
        set({ isLoading: false });
        return { error: error?.message || 'Erro ao conectar com Strava' };
      }

      // Load the connection
      await get().checkConnection(userId);

      // Fetch athlete profile from Strava to get weight + name
      const conn = get().connection;
      if (conn) {
        try {
          const token = await refreshIfNeeded(conn);
          if (token) {
            const res = await fetch(`${STRAVA_API}/athlete`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const athlete = await res.json();
              const profileUpdates: Record<string, any> = {};

              // Pull weight (Strava returns kg)
              if (athlete.weight && athlete.weight > 0) {
                profileUpdates.weight_kg = Math.round(athlete.weight * 10) / 10;
              }

              // Pull name if user profile doesn't have one yet
              const { data: currentProfile } = await supabase
                .from('profiles')
                .select('name, weight_kg, height_cm')
                .eq('id', userId)
                .single();

              if (currentProfile) {
                // Only update name if it's empty or generic
                const hasGenericName = !currentProfile.name ||
                  currentProfile.name === 'Usuário' ||
                  currentProfile.name.includes('@');
                if (hasGenericName && (athlete.firstname || athlete.lastname)) {
                  profileUpdates.name = [athlete.firstname, athlete.lastname]
                    .filter(Boolean).join(' ');
                }
                // Only update weight if not already set
                if (!currentProfile.weight_kg && profileUpdates.weight_kg) {
                  // keep it
                } else {
                  delete profileUpdates.weight_kg;
                }
              }

              if (Object.keys(profileUpdates).length > 0) {
                await supabase.from('profiles').update(profileUpdates).eq('id', userId);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to fetch Strava athlete profile:', e);
        }
      }

      // First sync
      await get().syncAllStats();

      set({ isLoading: false });
      return { error: null };
    } catch (e: any) {
      set({ isLoading: false });
      return { error: e.message || 'Erro inesperado' };
    }
  },

  // ── Disconnect Strava ──
  disconnectStrava: async () => {
    const conn = get().connection;
    if (!conn) return;

    try {
      // Deauthorize on Strava
      await fetch(STRAVA_DEAUTH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.access_token}` },
      });
    } catch {}

    // Delete from Supabase
    await supabase.from('strava_stats_cache').delete().eq('user_id', conn.user_id);
    await supabase.from('strava_connections').delete().eq('user_id', conn.user_id);

    set({
      isConnected: false,
      connection: null,
      weeklyKm: [0, 0, 0, 0, 0, 0, 0],
      weeklyTotal: 0,
      lifetimeDistanceKm: 0,
      lifetimeRunCount: 0,
      lifetimeMovingTimeHours: 0,
      lifetimeElevationM: 0,
      avgPace: '0:00',
      monthlyKm: [],
      lastSyncedAt: null,
    });
  },

  // ── Get valid access token (refresh if needed) ──
  syncAllStats: async () => {
    const { isSyncing, lastSyncedAt } = get();
    if (isSyncing) return;

    // Cooldown check
    if (lastSyncedAt) {
      const elapsed = Date.now() - new Date(lastSyncedAt).getTime();
      if (elapsed < SYNC_COOLDOWN_MS) return;
    }

    set({ isSyncing: true });
    await get().syncWeeklyStats();
    await get().syncLifetimeStats();
    set({ isSyncing: false });
  },

  // ── Refresh token if expired ──
  syncWeeklyStats: async () => {
    const conn = get().connection;
    if (!conn) return;

    // Refresh token if needed
    const token = await refreshIfNeeded(conn);
    if (!token) return;

    try {
      const after = getWeekStartEpoch();
      const res = await fetch(
        `${STRAVA_API}/athlete/activities?after=${after}&per_page=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return;
      const activities = await res.json();

      // Filter runs
      const runs = activities.filter((a: any) =>
        ['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike'].includes(a.sport_type)
      );

      // Group by day of week
      const dailyKm = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
      runs.forEach((a: any) => {
        const date = new Date(a.start_date_local);
        const dayIndex = (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
        dailyKm[dayIndex] += a.distance / 1000;
      });

      const weeklyTotal = dailyKm.reduce((sum, km) => sum + km, 0);

      // Save to Supabase cache
      await supabase
        .from('strava_stats_cache')
        .upsert({
          user_id: conn.user_id,
          weekly_km: dailyKm,
          weekly_total_km: weeklyTotal,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      set({
        weeklyKm: dailyKm,
        weeklyTotal: weeklyTotal,
        lastSyncedAt: new Date().toISOString(),
      });

      // Update home screen widget
      const goal = get().weeklyGoal;
      updateWidget?.({
        currentKm: weeklyTotal,
        goalKm: goal,
        progressPercent: goal > 0 ? Math.min((weeklyTotal / goal) * 100, 100) : 0,
      });
    } catch (e) {
      console.error('Strava weekly sync error:', e);
    }
  },

  syncLifetimeStats: async () => {
    const conn = get().connection;
    if (!conn) return;

    const token = await refreshIfNeeded(conn);
    if (!token) return;

    try {
      // Get athlete stats
      const statsRes = await fetch(
        `${STRAVA_API}/athletes/${conn.strava_athlete_id}/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!statsRes.ok) return;
      const stats = await statsRes.json();

      const allRun = stats.all_run_totals || {};
      const distanceM = allRun.distance || 0;
      const movingTimeS = allRun.moving_time || 0;
      const elevationM = allRun.elevation_gain || 0;
      const runCount = allRun.count || 0;
      const avgSpeed = movingTimeS > 0 ? distanceM / movingTimeS : 0;

      // Fetch last 6 months of activities for monthly breakdown
      const sixMonthsAgo = Math.floor(Date.now() / 1000) - (180 * 24 * 3600);
      const activitiesRes = await fetch(
        `${STRAVA_API}/athlete/activities?after=${sixMonthsAgo}&per_page=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let monthlyKm: MonthlyKm[] = [];
      if (activitiesRes.ok) {
        const activities = await activitiesRes.json();
        const runs = activities.filter((a: any) =>
          ['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike'].includes(a.sport_type)
        );

        // Group by month
        const monthMap = new Map<string, number>();
        runs.forEach((a: any) => {
          const date = new Date(a.start_date_local);
          const key = `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}`;
          const current = monthMap.get(key) || 0;
          monthMap.set(key, current + a.distance / 1000);
        });

        // Sort by date and take last 6
        const sorted = Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6);

        monthlyKm = sorted.map(([key, km]) => {
          const [year, monthIdx] = key.split('-').map(Number);
          const date = new Date(year, monthIdx);
          return { month: getMonthAbbr(date), km: Math.round(km) };
        });
      }

      // Save to Supabase cache
      await supabase
        .from('strava_stats_cache')
        .upsert({
          user_id: conn.user_id,
          lifetime_distance_m: distanceM,
          lifetime_run_count: runCount,
          lifetime_moving_time_s: movingTimeS,
          lifetime_elevation_m: elevationM,
          avg_pace_mps: avgSpeed,
          monthly_km: monthlyKm,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      set({
        lifetimeDistanceKm: distanceM / 1000,
        lifetimeRunCount: runCount,
        lifetimeMovingTimeHours: Math.round(movingTimeS / 3600),
        lifetimeElevationM: Math.round(elevationM),
        avgPace: speedToPace(avgSpeed),
        monthlyKm,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Strava lifetime sync error:', e);
    }
  },

  fetchRuns: async (userId) => {
    set({ isLoadingRuns: true });
    try {
      const { data, error } = await supabase
        .from('strava_awarded_runs')
        .select('*')
        .eq('user_id', userId)
        .order('activity_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      const runs: StravaRun[] = (data ?? []).map((r: any) => ({
        id: r.id,
        strava_activity_id: r.strava_activity_id,
        activity_name: r.activity_name ?? 'Corrida',
        activity_date: r.activity_date,
        distance_km: Number(r.distance_km),
        moving_time_seconds: r.moving_time_seconds ?? 0,
        average_speed: Number(r.average_speed) ?? 0,
        sparks_awarded: r.sparks_awarded,
      }));

      const totalSparksEarned = runs.reduce((sum, r) => sum + r.sparks_awarded, 0);
      set({ runs, totalSparksEarned, isLoadingRuns: false });
    } catch (e) {
      console.error('fetchRuns error:', e);
      set({ isLoadingRuns: false });
    }
  },

  syncAndAwardRuns: async (userId) => {
    const conn = get().connection;
    if (!conn) return;

    const token = await refreshIfNeeded(conn);
    if (!token) return;

    try {
      // Get user's signup date to only award post-signup runs
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (!profile) return;

      const ONE_DAY = 24 * 60 * 60;
      const signupEpoch = Math.floor(new Date(profile.created_at).getTime() / 1000) - ONE_DAY;

      // Fetch activities after signup-24h (paginated, max 200)
      const res = await fetch(
        `${STRAVA_API}/athlete/activities?after=${signupEpoch}&per_page=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return;
      const activities = await res.json();

      // Filter only runs
      const runs = activities.filter((a: any) =>
        ['Run', 'TrailRun', 'VirtualRun'].includes(a.sport_type)
      );

      if (runs.length === 0) return;

      // Get already-awarded activity IDs
      const { data: awarded } = await supabase
        .from('strava_awarded_runs')
        .select('strava_activity_id')
        .eq('user_id', userId);

      const awardedIds = new Set((awarded ?? []).map((a: any) => a.strava_activity_id));

      // Find new runs to award
      const newRuns = runs.filter((a: any) => !awardedIds.has(a.id));
      if (newRuns.length === 0) return;

      let totalNewSparks = 0;

      for (const activity of newRuns) {
        const distanceKm = Math.round((activity.distance / 1000) * 100) / 100;
        const sparks = Math.floor(distanceKm); // 1 spark per km

        if (sparks <= 0) continue;

        // Insert awarded run
        await supabase.from('strava_awarded_runs').insert({
          user_id: userId,
          strava_activity_id: activity.id,
          distance_km: distanceKm,
          sparks_awarded: sparks,
          activity_name: activity.name ?? 'Corrida',
          activity_date: activity.start_date_local,
          moving_time_seconds: activity.moving_time ?? 0,
          average_speed: activity.average_speed ?? 0,
        });

        totalNewSparks += sparks;
      }

      // Award all sparks at once
      if (totalNewSparks > 0) {
        await supabase.from('points_ledger').insert({
          user_id: userId,
          amount: totalNewSparks,
          type: 'strava_run',
          description: `+${totalNewSparks} sparks por ${newRuns.length} corrida${newRuns.length > 1 ? 's' : ''}`,
        });

        await supabase.rpc('increment_points', {
          user_id_input: userId,
          amount_input: totalNewSparks,
        });
      }

      // Refresh local runs list
      await get().fetchRuns(userId);
    } catch (e) {
      console.error('syncAndAwardRuns error:', e);
    }
  },

  setWeeklyGoal: async (km) => {
    const conn = get().connection;
    if (!conn) return;

    await supabase
      .from('strava_stats_cache')
      .upsert({ user_id: conn.user_id, weekly_goal_km: km }, { onConflict: 'user_id' });

    set({ weeklyGoal: km });
  },
}));

// ── Token refresh helper ──
async function refreshIfNeeded(conn: StravaConnection): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  // If token is still valid (with 5 min buffer)
  if (conn.expires_at > now + 300) {
    return conn.access_token;
  }

  // Refresh via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('strava-auth', {
      body: { action: 'refresh', user_id: conn.user_id },
    });

    if (error || !data?.access_token) return null;

    // Update local state
    useStravaStore.setState({
      connection: {
        ...conn,
        access_token: data.access_token,
        refresh_token: data.refresh_token || conn.refresh_token,
        expires_at: data.expires_at,
      },
    });

    return data.access_token;
  } catch {
    return null;
  }
}

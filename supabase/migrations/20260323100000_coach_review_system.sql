-- ══════════════════════════════════════════════════════════════
-- Coach Review System — Weekly evaluation + plan adjustments
-- ══════════════════════════════════════════════════════════════

-- 1. Add selected_days and predicted_21k to coach_profiles
DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN selected_days text[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN predicted_21k text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN consecutive_build_weeks int DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN last_deload_week int DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Add weekly_review to coach_weekly_plans
DO $$ BEGIN
  ALTER TABLE public.coach_weekly_plans ADD COLUMN weekly_review jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add feedback_rpe to coach_workout_log (user self-reported feeling)
DO $$ BEGIN
  ALTER TABLE public.coach_workout_log ADD COLUMN feedback_note text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Enhanced get_coach_context RPC (v2 — includes review data)
CREATE OR REPLACE FUNCTION get_coach_context(p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile record;
  v_plan jsonb;
  v_prev_plan jsonb;
  v_recent_runs jsonb;
  v_recent_log jsonb;
  v_last_summary jsonb;
  v_week_log jsonb;
BEGIN
  -- Coach profile
  SELECT * INTO v_profile FROM coach_profiles WHERE user_id = p_user_id;

  -- Current week plan
  SELECT to_jsonb(p) INTO v_plan
  FROM coach_weekly_plans p
  WHERE user_id = p_user_id
  ORDER BY week_number DESC LIMIT 1;

  -- Previous week plan (for review comparison)
  SELECT to_jsonb(p) INTO v_prev_plan
  FROM coach_weekly_plans p
  WHERE user_id = p_user_id
  ORDER BY week_number DESC LIMIT 1 OFFSET 1;

  -- Last 8 weeks of runs (from strava_awarded_runs)
  SELECT jsonb_agg(row_to_json(r)) INTO v_recent_runs FROM (
    SELECT activity_date, distance_km, moving_time_seconds,
      ROUND(moving_time_seconds / NULLIF(distance_km, 0))::int AS pace_seconds_per_km
    FROM strava_awarded_runs
    WHERE user_id = p_user_id AND distance_km > 0
    ORDER BY activity_date DESC
    LIMIT 30
  ) r;

  -- Current week workout log
  SELECT jsonb_agg(row_to_json(l)) INTO v_week_log FROM (
    SELECT day_of_week, prescribed_type, prescribed_distance_km, prescribed_pace,
      actual_distance_km, actual_pace, actual_time_seconds, rpe, status,
      feedback_note, completed_at
    FROM coach_workout_log
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 21 -- up to 3 weeks of logs
  ) l;

  -- Recent workout log (last 4 weeks for trend)
  SELECT jsonb_agg(row_to_json(l)) INTO v_recent_log FROM (
    SELECT day_of_week, prescribed_type, prescribed_distance_km,
      actual_distance_km, actual_pace, rpe, status, completed_at
    FROM coach_workout_log
    WHERE user_id = p_user_id AND created_at >= now() - interval '28 days'
    ORDER BY created_at DESC
  ) l;

  -- Last weekly summary
  SELECT to_jsonb(s) INTO v_last_summary FROM (
    SELECT week_number, volume_target_km, volume_done_km, completion_pct,
      pace_trend, message
    FROM coach_weekly_summaries
    WHERE user_id = p_user_id
    ORDER BY week_number DESC LIMIT 1
  ) s;

  RETURN json_build_object(
    'profile', CASE WHEN v_profile IS NOT NULL THEN row_to_json(v_profile) ELSE NULL END,
    'current_plan', v_plan,
    'previous_plan', v_prev_plan,
    'recent_runs', COALESCE(v_recent_runs, '[]'::jsonb),
    'workout_log', COALESCE(v_week_log, '[]'::jsonb),
    'recent_log', COALESCE(v_recent_log, '[]'::jsonb),
    'last_summary', v_last_summary
  );
END; $$;

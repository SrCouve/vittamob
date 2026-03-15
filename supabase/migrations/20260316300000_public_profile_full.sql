-- ══════════════════════════════════════════════════════════════
-- VITTA UP — Enhanced public profile + Strava data for any user
-- Migration: 20260316300000_public_profile_full.sql
-- Depends on: 20260316000000_social_graph.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════
-- 1. Update get_user_public_profile to return weight, height, total_lessons, total_hours
--    (These columns already exist in profiles; the RPC SELECT already includes them
--     but we re-create the function to be explicit and add has_strava flag.)
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_public_profile(p_viewer_id uuid, p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_relationship json;
  v_blocked_by_target boolean;
  v_has_strava boolean;
BEGIN
  -- Check if target blocked the viewer
  v_blocked_by_target := EXISTS (
    SELECT 1 FROM public.blocks WHERE blocker_id = p_target_id AND blocked_id = p_viewer_id
  );

  IF v_blocked_by_target THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Fetch profile
  SELECT p.id, p.name, p.avatar_url, p.bio, p.interests, p.is_private,
         p.points_balance, p.streak_days, p.total_lessons, p.total_hours,
         p.weight_kg, p.height_cm,
         p.followers_count, p.following_count, p.created_at
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_target_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Check if target has Strava connected
  v_has_strava := EXISTS (
    SELECT 1 FROM public.strava_connections WHERE user_id = p_target_id
  );

  -- Get relationship
  IF p_viewer_id = p_target_id THEN
    v_relationship := json_build_object('i_follow', false, 'they_follow', false, 'is_mutual', false, 'is_blocked', false, 'is_self', true);
  ELSE
    v_relationship := public.get_relationship_status(p_viewer_id, p_target_id);
  END IF;

  -- If private AND viewer doesn't follow -> limited data
  IF v_profile.is_private AND p_viewer_id != p_target_id
     AND NOT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p_target_id) THEN
    RETURN json_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'avatar_url', v_profile.avatar_url,
      'bio', v_profile.bio,
      'is_private', v_profile.is_private,
      'followers_count', v_profile.followers_count,
      'following_count', v_profile.following_count,
      'relationship', v_relationship,
      'limited', true
    );
  END IF;

  -- Full profile
  RETURN json_build_object(
    'id', v_profile.id,
    'name', v_profile.name,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'is_private', v_profile.is_private,
    'points_balance', v_profile.points_balance,
    'streak_days', v_profile.streak_days,
    'total_lessons', v_profile.total_lessons,
    'total_hours', v_profile.total_hours,
    'weight_kg', v_profile.weight_kg,
    'height_cm', v_profile.height_cm,
    'followers_count', v_profile.followers_count,
    'following_count', v_profile.following_count,
    'created_at', v_profile.created_at,
    'has_strava', v_has_strava,
    'relationship', v_relationship,
    'limited', false
  );
END;
$$;

-- ══════════════════════════════════════
-- 2. RPC to get another user's Strava stats (from cache)
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_strava_data(p_viewer_id uuid, p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats record;
  v_runs jsonb;
BEGIN
  -- Check if target has Strava connected
  IF NOT EXISTS (SELECT 1 FROM public.strava_connections WHERE user_id = p_target_id) THEN
    RETURN json_build_object('connected', false);
  END IF;

  -- Check privacy: if target is private and viewer doesn't follow, no Strava data
  IF p_viewer_id != p_target_id
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_id AND is_private = true)
     AND NOT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p_target_id)
  THEN
    RETURN json_build_object('connected', false);
  END IF;

  -- Get cached stats
  SELECT s.weekly_km, s.weekly_total_km, s.weekly_goal_km,
         s.lifetime_distance_m, s.lifetime_run_count,
         s.lifetime_moving_time_s, s.lifetime_elevation_m,
         s.avg_pace_mps, s.monthly_km, s.last_synced_at
  INTO v_stats
  FROM public.strava_stats_cache s
  WHERE s.user_id = p_target_id;

  -- Get runs
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'strava_activity_id', r.strava_activity_id,
      'activity_name', r.activity_name,
      'activity_date', r.activity_date,
      'distance_km', r.distance_km,
      'moving_time_seconds', r.moving_time_seconds,
      'average_speed', r.average_speed,
      'sparks_awarded', r.sparks_awarded,
      'workout_type', r.workout_type
    ) ORDER BY r.activity_date DESC
  ), '[]'::jsonb)
  INTO v_runs
  FROM public.strava_awarded_runs r
  WHERE r.user_id = p_target_id;

  IF v_stats IS NULL THEN
    RETURN json_build_object(
      'connected', true,
      'stats', null,
      'runs', v_runs
    );
  END IF;

  RETURN json_build_object(
    'connected', true,
    'stats', json_build_object(
      'weekly_km', v_stats.weekly_km,
      'weekly_total_km', v_stats.weekly_total_km,
      'weekly_goal_km', v_stats.weekly_goal_km,
      'lifetime_distance_m', v_stats.lifetime_distance_m,
      'lifetime_run_count', v_stats.lifetime_run_count,
      'lifetime_moving_time_s', v_stats.lifetime_moving_time_s,
      'lifetime_elevation_m', v_stats.lifetime_elevation_m,
      'avg_pace_mps', v_stats.avg_pace_mps,
      'monthly_km', v_stats.monthly_km,
      'last_synced_at', v_stats.last_synced_at
    ),
    'runs', v_runs
  );
END;
$$;

-- ══════════════════════════════════════
-- 3. RLS for strava tables — allow reading other users' cached data
--    (the RPC is SECURITY DEFINER so it bypasses RLS,
--     but direct queries from the app also need read access)
-- ══════════════════════════════════════

-- strava_stats_cache: allow authenticated users to read all (stats are non-sensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'strava_stats_cache'
      AND policyname = 'Authenticated can read all strava stats'
  ) THEN
    CREATE POLICY "Authenticated can read all strava stats"
      ON public.strava_stats_cache
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- strava_awarded_runs: allow authenticated users to read all (run data is non-sensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'strava_awarded_runs'
      AND policyname = 'Authenticated can read all awarded runs'
  ) THEN
    CREATE POLICY "Authenticated can read all awarded runs"
      ON public.strava_awarded_runs
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

COMMIT;

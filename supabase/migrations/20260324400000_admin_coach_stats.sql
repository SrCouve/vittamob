-- Admin RPC to get coach stats (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_coach_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total int;
  v_active_week int;
  v_avg_vdot numeric;
  v_goals jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM coach_profiles;

  SELECT COUNT(*) INTO v_active_week FROM coach_profiles
  WHERE updated_at >= now() - interval '7 days';

  SELECT ROUND(AVG(vdot)) INTO v_avg_vdot FROM coach_profiles
  WHERE vdot > 0;

  SELECT jsonb_agg(row_to_json(g)) INTO v_goals FROM (
    SELECT goal, COUNT(*) as count FROM coach_profiles GROUP BY goal ORDER BY count DESC
  ) g;

  RETURN json_build_object(
    'total_coaches', COALESCE(v_total, 0),
    'active_this_week', COALESCE(v_active_week, 0),
    'avg_vdot', COALESCE(v_avg_vdot, 0),
    'goals', COALESCE(v_goals, '[]'::jsonb)
  );
END; $$;

-- Admin RPC to check which users have strava/coach (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_user_features(p_user_ids uuid[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_strava jsonb;
  v_coach jsonb;
BEGIN
  SELECT jsonb_agg(user_id) INTO v_strava FROM strava_connections WHERE user_id = ANY(p_user_ids);
  SELECT jsonb_agg(user_id) INTO v_coach FROM coach_profiles WHERE user_id = ANY(p_user_ids);

  RETURN json_build_object(
    'strava', COALESCE(v_strava, '[]'::jsonb),
    'coach', COALESCE(v_coach, '[]'::jsonb)
  );
END; $$;

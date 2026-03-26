-- Admin RPC: get all coach users with details
CREATE OR REPLACE FUNCTION admin_get_coach_users()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r)) FROM (
      SELECT
        cp.user_id,
        p.name,
        p.avatar_url,
        cp.goal,
        cp.race_distance,
        cp.level,
        cp.vdot,
        cp.plan_current_week,
        cp.plan_total_weeks,
        cp.plan_phase,
        cp.days_per_week,
        cp.predicted_5k,
        cp.predicted_10k,
        cp.created_at,
        cp.updated_at,
        (SELECT COUNT(*) FROM coach_messages cm WHERE cm.user_id = cp.user_id) as total_messages,
        (SELECT COUNT(*) FROM coach_messages cm WHERE cm.user_id = cp.user_id AND cm.role = 'user') as user_messages,
        (SELECT COUNT(*) FROM coach_workout_log wl WHERE wl.user_id = cp.user_id AND wl.status = 'completed') as workouts_completed,
        (SELECT COUNT(*) FROM coach_workout_log wl WHERE wl.user_id = cp.user_id AND wl.status = 'skipped') as workouts_skipped,
        (SELECT ROUND(AVG(wl.rpe), 1) FROM coach_workout_log wl WHERE wl.user_id = cp.user_id AND wl.rpe > 0) as avg_rpe,
        (SELECT COUNT(*) FROM coach_weekly_plans wp WHERE wp.user_id = cp.user_id) as total_plans
      FROM coach_profiles cp
      JOIN profiles p ON p.id = cp.user_id
      ORDER BY cp.updated_at DESC
    ) r
  );
END; $$;

-- Admin RPC: coach overview numbers
CREATE OR REPLACE FUNCTION admin_coach_overview()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total int;
  v_active_7d int;
  v_total_messages int;
  v_total_workouts_done int;
  v_total_workouts_skipped int;
  v_avg_vdot numeric;
  v_avg_adherence numeric;
  v_total_plans int;
  v_goals jsonb;
  v_levels jsonb;
  v_phases jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM coach_profiles;
  SELECT COUNT(*) INTO v_active_7d FROM coach_profiles WHERE updated_at >= now() - interval '7 days';
  SELECT COUNT(*) INTO v_total_messages FROM coach_messages;
  SELECT COUNT(*) INTO v_total_workouts_done FROM coach_workout_log WHERE status = 'completed';
  SELECT COUNT(*) INTO v_total_workouts_skipped FROM coach_workout_log WHERE status = 'skipped';
  SELECT ROUND(AVG(vdot), 1) INTO v_avg_vdot FROM coach_profiles WHERE vdot > 0;
  SELECT COUNT(*) INTO v_total_plans FROM coach_weekly_plans;

  -- Adherence: completed / (completed + skipped) per user, then average
  SELECT ROUND(AVG(adherence) * 100) INTO v_avg_adherence FROM (
    SELECT user_id,
      CASE WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) ELSE 0 END as adherence
    FROM coach_workout_log GROUP BY user_id
  ) sub;

  SELECT jsonb_agg(row_to_json(g)) INTO v_goals FROM (
    SELECT goal, COUNT(*) as count FROM coach_profiles GROUP BY goal ORDER BY count DESC
  ) g;

  SELECT jsonb_agg(row_to_json(l)) INTO v_levels FROM (
    SELECT level, COUNT(*) as count FROM coach_profiles GROUP BY level ORDER BY count DESC
  ) l;

  SELECT jsonb_agg(row_to_json(ph)) INTO v_phases FROM (
    SELECT plan_phase as phase, COUNT(*) as count FROM coach_profiles GROUP BY plan_phase ORDER BY count DESC
  ) ph;

  RETURN json_build_object(
    'total_athletes', COALESCE(v_total, 0),
    'active_7d', COALESCE(v_active_7d, 0),
    'total_messages', COALESCE(v_total_messages, 0),
    'total_workouts_done', COALESCE(v_total_workouts_done, 0),
    'total_workouts_skipped', COALESCE(v_total_workouts_skipped, 0),
    'avg_vdot', COALESCE(v_avg_vdot, 0),
    'avg_adherence', COALESCE(v_avg_adherence, 0),
    'total_plans', COALESCE(v_total_plans, 0),
    'goals', COALESCE(v_goals, '[]'::jsonb),
    'levels', COALESCE(v_levels, '[]'::jsonb),
    'phases', COALESCE(v_phases, '[]'::jsonb)
  );
END; $$;

-- Watch app: get all data for a user in one call
CREATE OR REPLACE FUNCTION get_watch_data(p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile record;
  v_rank int;
  v_runs bigint;
  v_weekly_km numeric;
  week_start timestamptz;
BEGIN
  SELECT name, points_balance, streak_days INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  week_start := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  SELECT pos INTO v_rank FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY SUM(distance_km) DESC) AS pos
    FROM strava_awarded_runs WHERE activity_date >= week_start::date
    GROUP BY user_id HAVING SUM(distance_km) > 0
  ) ranked WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_runs FROM strava_awarded_runs WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(distance_km), 0) INTO v_weekly_km
  FROM strava_awarded_runs WHERE user_id = p_user_id AND activity_date >= week_start::date;

  RETURN json_build_object(
    'name', v_profile.name,
    'sparks', v_profile.points_balance,
    'streak', v_profile.streak_days,
    'rank', COALESCE(v_rank, 0),
    'total_runs', v_runs,
    'weekly_km', v_weekly_km
  );
END; $$;

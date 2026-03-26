-- Get a user's rank position this week
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rank int;
  week_start timestamptz;
BEGIN
  week_start := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  SELECT pos INTO v_rank FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY SUM(distance_km) DESC) AS pos
    FROM strava_awarded_runs
    WHERE activity_date >= week_start::date
    GROUP BY user_id
    HAVING SUM(distance_km) > 0
  ) ranked
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_rank, 0);
END; $$;

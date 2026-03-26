-- Add is_verified to weekly rank RPCs
DROP FUNCTION IF EXISTS get_weekly_top_members_filtered(uuid, int);
CREATE OR REPLACE FUNCTION get_weekly_top_members_filtered(p_viewer_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE(user_id uuid, user_name text, avatar_url text, weekly_km numeric, weekly_energia bigint, post_count bigint, is_verified boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, COALESCE(ws.km, 0) AS weekly_km,
    COALESCE(ws.sparks, 0)::bigint AS weekly_energia, 0::bigint AS post_count, p.is_verified
  FROM profiles p
  JOIN (SELECT r.user_id, SUM(r.distance_km) AS km, SUM(r.sparks_awarded) AS sparks
        FROM strava_awarded_runs r WHERE r.activity_date >= week_start::date
        GROUP BY r.user_id HAVING SUM(r.distance_km) > 0) ws ON ws.user_id = p.id
  WHERE NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = p.id) OR (b.blocker_id = p.id AND b.blocked_id = p_viewer_id))
    AND (p.id = p_viewer_id OR p.is_private IS NOT TRUE OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = p_viewer_id AND f.following_id = p.id))
  ORDER BY ws.km DESC LIMIT p_limit;
END; $$;

DROP FUNCTION IF EXISTS get_weekly_top_members(int);
CREATE OR REPLACE FUNCTION get_weekly_top_members(p_limit int DEFAULT 5)
RETURNS TABLE(user_id uuid, user_name text, avatar_url text, weekly_km numeric, weekly_energia bigint, post_count bigint, is_verified boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, COALESCE(ws.km, 0),
    COALESCE(ws.sparks, 0)::bigint, 0::bigint, p.is_verified
  FROM profiles p
  JOIN (SELECT r.user_id, SUM(r.distance_km) AS km, SUM(r.sparks_awarded) AS sparks
        FROM strava_awarded_runs r WHERE r.activity_date >= week_start::date
        GROUP BY r.user_id HAVING SUM(r.distance_km) > 0) ws ON ws.user_id = p.id
  ORDER BY ws.km DESC LIMIT p_limit;
END; $$;

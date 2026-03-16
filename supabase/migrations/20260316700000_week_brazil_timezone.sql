-- Fix weekly reset to use Brazil timezone (00:00 Brasilia = 03:00 UTC)
-- Affects: Rank da Semana, top members, weekly posts/reactions count

CREATE OR REPLACE FUNCTION public.get_weekly_top_members_filtered(
  p_viewer_id uuid,
  p_limit int DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  avatar_url text,
  weekly_km numeric,
  weekly_energia bigint,
  post_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_start TIMESTAMPTZ;
BEGIN
  -- Monday 00:00 in Brasilia timezone
  week_start := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  RETURN QUERY
  WITH weekly_posts AS (
    SELECT cp.user_id, COUNT(*) AS cnt
    FROM community_posts cp
    WHERE cp.created_at >= week_start
    GROUP BY cp.user_id
  ), weekly_reactions AS (
    SELECT pr.user_id, COUNT(*) AS cnt
    FROM post_reactions pr
    WHERE pr.created_at >= week_start
    GROUP BY pr.user_id
  ), weekly_strava AS (
    SELECT sc.user_id, COALESCE(sc.weekly_total_km, 0) AS km
    FROM strava_stats_cache sc
  )
  SELECT p.id, p.name, p.avatar_url,
    COALESCE(ws.km, 0), COALESCE(wr.cnt, 0), COALESCE(wp.cnt, 0)
  FROM profiles p
  LEFT JOIN weekly_posts wp ON wp.user_id = p.id
  LEFT JOIN weekly_reactions wr ON wr.user_id = p.id
  LEFT JOIN weekly_strava ws ON ws.user_id = p.id
  WHERE
    (COALESCE(ws.km, 0) > 0 OR COALESCE(wp.cnt, 0) > 0 OR COALESCE(wr.cnt, 0) > 0)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = p_viewer_id)
    )
    AND (
      p.id = p_viewer_id
      OR p.is_private IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_viewer_id AND f.following_id = p.id
      )
    )
  ORDER BY COALESCE(ws.km, 0) DESC, COALESCE(wr.cnt, 0) DESC, COALESCE(wp.cnt, 0) DESC
  LIMIT p_limit;
END; $$;

-- Also fix the original (non-filtered) version
CREATE OR REPLACE FUNCTION get_weekly_top_members(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (user_id UUID, user_name TEXT, avatar_url TEXT, weekly_km NUMERIC, weekly_energia BIGINT, post_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  RETURN QUERY
  WITH weekly_posts AS (
    SELECT cp.user_id, COUNT(*) AS cnt FROM community_posts cp WHERE cp.created_at >= week_start GROUP BY cp.user_id
  ), weekly_reactions AS (
    SELECT pr.user_id, COUNT(*) AS cnt FROM post_reactions pr WHERE pr.created_at >= week_start GROUP BY pr.user_id
  ), weekly_strava AS (
    SELECT sc.user_id, COALESCE(sc.weekly_total_km, 0) AS km FROM strava_stats_cache sc
  )
  SELECT p.id, p.name, p.avatar_url,
    COALESCE(ws.km, 0), COALESCE(wr.cnt, 0), COALESCE(wp.cnt, 0)
  FROM profiles p
  LEFT JOIN weekly_posts wp ON wp.user_id = p.id
  LEFT JOIN weekly_reactions wr ON wr.user_id = p.id
  LEFT JOIN weekly_strava ws ON ws.user_id = p.id
  WHERE COALESCE(wp.cnt, 0) + COALESCE(wr.cnt, 0) > 0
  ORDER BY (COALESCE(wp.cnt, 0) * 3 + COALESCE(wr.cnt, 0) + COALESCE(ws.km, 0) * 0.5) DESC
  LIMIT p_limit;
END; $$;

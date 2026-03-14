-- Profile body stats (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm INTEGER;

-- Atomic comment insert
CREATE OR REPLACE FUNCTION add_comment(p_post_id UUID, p_user_id UUID, p_content TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_comment_id UUID;
BEGIN
  INSERT INTO post_comments (post_id, user_id, content)
  VALUES (p_post_id, p_user_id, p_content)
  RETURNING id INTO new_comment_id;
  UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
  RETURN json_build_object('comment_id', new_comment_id);
END; $$;

-- Weekly top members
CREATE OR REPLACE FUNCTION get_weekly_top_members(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (user_id UUID, user_name TEXT, avatar_url TEXT, weekly_km NUMERIC, weekly_energia BIGINT, post_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', now());
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

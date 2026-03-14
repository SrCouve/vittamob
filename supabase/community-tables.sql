-- ============================================
-- VITTA UP - Community / Social Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Activity Feed Posts
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lesson_complete', 'module_complete', 'streak', 'challenge_join', 'text', 'photo')),
  content TEXT, -- optional text for 'text'/'photo' type, auto-generated for others
  metadata JSONB DEFAULT '{}', -- { lesson_id, module_title, streak_days, etc. }
  image_url TEXT, -- URL from Supabase Storage for photo posts
  energia_count INTEGER DEFAULT 0, -- denormalized reaction count
  comment_count INTEGER DEFAULT 0, -- denormalized comment count
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_user ON community_posts(user_id);

-- 2. Energia Reactions (branded single-tap, one per user per post)
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);

-- 3. Comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Posts: anyone authenticated can read, users can insert their own
CREATE POLICY "Anyone can read posts" ON community_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions: anyone can read, users can insert/delete their own
CREATE POLICY "Anyone can read reactions" ON post_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can react" ON post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unreact" ON post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, users can insert their own
CREATE POLICY "Anyone can read comments" ON post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can comment" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Functions for atomic count updates
-- ============================================

-- Toggle energia reaction (insert or delete + update count)
CREATE OR REPLACE FUNCTION toggle_energia(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existed BOOLEAN;
BEGIN
  -- Try to delete existing reaction
  DELETE FROM post_reactions WHERE post_id = p_post_id AND user_id = p_user_id;
  existed := FOUND;

  IF existed THEN
    -- Removed reaction, decrement
    UPDATE community_posts SET energia_count = GREATEST(energia_count - 1, 0) WHERE id = p_post_id;
    RETURN false; -- now unreacted
  ELSE
    -- Add reaction, increment
    INSERT INTO post_reactions (post_id, user_id) VALUES (p_post_id, p_user_id);
    UPDATE community_posts SET energia_count = energia_count + 1 WHERE id = p_post_id;
    RETURN true; -- now reacted
  END IF;
END;
$$;

-- Increment comment count (kept for backwards compatibility)
CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
END;
$$;

-- Atomic: insert comment + increment count in one transaction
CREATE OR REPLACE FUNCTION add_comment(p_post_id UUID, p_user_id UUID, p_content TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_comment_id UUID;
BEGIN
  -- Insert comment
  INSERT INTO post_comments (post_id, user_id, content)
  VALUES (p_post_id, p_user_id, p_content)
  RETURNING id INTO new_comment_id;

  -- Increment denormalized count
  UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = p_post_id;

  RETURN json_build_object('comment_id', new_comment_id);
END;
$$;

-- Weekly top members: most active users this week (posts + energia given)
CREATE OR REPLACE FUNCTION get_weekly_top_members(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  weekly_km NUMERIC,
  weekly_energia BIGINT,
  post_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', now());

  RETURN QUERY
  WITH weekly_posts AS (
    SELECT cp.user_id, COUNT(*) AS cnt
    FROM community_posts cp
    WHERE cp.created_at >= week_start
    GROUP BY cp.user_id
  ),
  weekly_reactions AS (
    SELECT pr.user_id, COUNT(*) AS cnt
    FROM post_reactions pr
    WHERE pr.created_at >= week_start
    GROUP BY pr.user_id
  ),
  weekly_strava AS (
    SELECT sc.user_id, COALESCE(sc.weekly_total_km, 0) AS km
    FROM strava_stats_cache sc
  )
  SELECT
    p.id AS user_id,
    p.name AS user_name,
    p.avatar_url,
    COALESCE(ws.km, 0) AS weekly_km,
    COALESCE(wr.cnt, 0) AS weekly_energia,
    COALESCE(wp.cnt, 0) AS post_count
  FROM profiles p
  LEFT JOIN weekly_posts wp ON wp.user_id = p.id
  LEFT JOIN weekly_reactions wr ON wr.user_id = p.id
  LEFT JOIN weekly_strava ws ON ws.user_id = p.id
  WHERE COALESCE(wp.cnt, 0) + COALESCE(wr.cnt, 0) > 0
  ORDER BY (COALESCE(wp.cnt, 0) * 3 + COALESCE(wr.cnt, 0) + COALESCE(ws.km, 0) * 0.5) DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- Photo posts support + delete post RPC
-- ============================================

-- 1. Add image_url column
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Drop old type CHECK and add new one with 'photo'
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('lesson_complete', 'module_complete', 'streak', 'challenge_join', 'text', 'photo'));

-- 3. Atomic delete post: removes post + decrements nothing (CASCADE handles children)
-- But we also need to clean up storage if image exists
CREATE OR REPLACE FUNCTION delete_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_owner UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO post_owner FROM community_posts WHERE id = p_post_id;

  IF post_owner IS NULL THEN
    RETURN false;
  END IF;

  IF post_owner != p_user_id THEN
    RETURN false;
  END IF;

  -- Delete post (CASCADE removes comments + reactions)
  DELETE FROM community_posts WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- 4. Storage bucket for community images
-- Note: Run this in Supabase Dashboard > Storage > New Bucket
-- Bucket name: community-images
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

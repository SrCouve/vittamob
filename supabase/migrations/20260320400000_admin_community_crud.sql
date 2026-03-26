-- Admin: delete any post (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION admin_delete_post(p_post_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM community_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  RETURN json_build_object('success', true);
END; $$;

-- Admin: delete any comment
CREATE OR REPLACE FUNCTION admin_delete_comment(p_comment_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM post_comments WHERE id = p_comment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  RETURN json_build_object('success', true);
END; $$;

-- Admin: get all posts with profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_posts(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, user_id uuid, content text, type text, image_url text,
  created_at timestamptz, user_name text, user_avatar text,
  comment_count bigint, reaction_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id, cp.user_id, cp.content, cp.type, cp.image_url,
    cp.created_at,
    p.name AS user_name, p.avatar_url AS user_avatar,
    (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = cp.id)::bigint AS comment_count,
    (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = cp.id)::bigint AS reaction_count
  FROM community_posts cp
  JOIN profiles p ON p.id = cp.user_id
  ORDER BY cp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END; $$;

-- Admin: community stats
CREATE OR REPLACE FUNCTION admin_community_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_posts bigint; v_comments bigint; v_today bigint; v_reactions bigint;
BEGIN
  SELECT COUNT(*) INTO v_posts FROM community_posts;
  SELECT COUNT(*) INTO v_comments FROM post_comments;
  SELECT COUNT(*) INTO v_today FROM community_posts WHERE created_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo';
  SELECT COUNT(*) INTO v_reactions FROM post_reactions;
  RETURN json_build_object('posts', v_posts, 'comments', v_comments, 'today', v_today, 'reactions', v_reactions);
END; $$;

-- Admin: delete challenge
CREATE OR REPLACE FUNCTION admin_delete_challenge(p_challenge_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  RETURN json_build_object('success', true);
END; $$;

-- Admin: delete event
CREATE OR REPLACE FUNCTION admin_delete_event(p_event_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  RETURN json_build_object('success', true);
END; $$;

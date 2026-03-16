-- Fix mutual follows logic:
-- Should return "people YOU follow that also follow the TARGET"
-- (Instagram pattern: "Followed by maria, joao and 3 others")
-- NOT "people you both follow"

CREATE OR REPLACE FUNCTION get_mutual_follows(p_viewer_id uuid, p_target_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url
  FROM follows f1
  JOIN follows f2 ON f2.follower_id = f1.following_id  -- the person I follow ALSO follows the target
  JOIN profiles p ON p.id = f1.following_id
  WHERE f1.follower_id = p_viewer_id           -- people I follow
    AND f2.following_id = p_target_id           -- who also follow the target
    AND f1.following_id != p_viewer_id
    AND f1.following_id != p_target_id
  LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION count_mutual_follows(p_viewer_id uuid, p_target_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM follows f1
  JOIN follows f2 ON f2.follower_id = f1.following_id
  WHERE f1.follower_id = p_viewer_id
    AND f2.following_id = p_target_id
    AND f1.following_id != p_viewer_id
    AND f1.following_id != p_target_id;
  RETURN v_count;
END; $$;

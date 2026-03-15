-- count_friends: returns the number of mutual follows for a user
CREATE OR REPLACE FUNCTION count_friends(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM follows f1
  JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
  WHERE f1.follower_id = p_user_id;
  RETURN v_count;
END; $$;

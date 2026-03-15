-- ══════════════════════════════════════════════════════════════
-- VITTA UP — Mutual Follows RPC
-- Migration: 20260316100001_mutual_follows_rpc.sql
-- Depends on: 20260316000000_social_graph.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════
-- 1. get_mutual_follows — returns users followed by both viewer and target
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION get_mutual_follows(p_viewer_id uuid, p_target_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url
  FROM follows f1
  JOIN follows f2 ON f2.following_id = f1.following_id
  JOIN profiles p ON p.id = f1.following_id
  WHERE f1.follower_id = p_viewer_id
    AND f2.follower_id = p_target_id
    AND f1.following_id != p_viewer_id
    AND f1.following_id != p_target_id
  LIMIT p_limit;
END; $$;

-- ══════════════════════════════════════
-- 2. count_mutual_follows — returns total count of mutual follows
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION count_mutual_follows(p_viewer_id uuid, p_target_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM follows f1
  JOIN follows f2 ON f2.following_id = f1.following_id
  WHERE f1.follower_id = p_viewer_id
    AND f2.follower_id = p_target_id
    AND f1.following_id != p_viewer_id
    AND f1.following_id != p_target_id;
  RETURN v_count;
END; $$;

COMMIT;

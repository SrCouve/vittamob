-- Fix: decrement comment_count when a comment is deleted
CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE community_posts
  SET comment_count = GREATEST(comment_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_comment_count ON post_comments;
CREATE TRIGGER trg_decrement_comment_count
  AFTER DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comment_count();

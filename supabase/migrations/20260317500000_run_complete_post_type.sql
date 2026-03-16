-- Add 'run_complete' to the community_posts type check constraint
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('lesson_complete', 'module_complete', 'streak', 'challenge_join', 'text', 'photo', 'run_complete'));

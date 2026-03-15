BEGIN;

-- ══════════════════════════════════════
-- Mutes table
-- ══════════════════════════════════════

CREATE TABLE public.mutes (
  muter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  muted_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mutes" ON public.mutes
  FOR SELECT USING (auth.uid() = muter_id);
CREATE POLICY "Users can mute" ON public.mutes
  FOR INSERT WITH CHECK (auth.uid() = muter_id);
CREATE POLICY "Users can unmute" ON public.mutes
  FOR DELETE USING (auth.uid() = muter_id);

CREATE INDEX idx_mutes_muter ON public.mutes (muter_id);

-- ══════════════════════════════════════
-- Mute / Unmute RPCs
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION mute_user(p_muter_id uuid, p_muted_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO mutes (muter_id, muted_id) VALUES (p_muter_id, p_muted_id)
  ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION unmute_user(p_muter_id uuid, p_muted_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM mutes WHERE muter_id = p_muter_id AND muted_id = p_muted_id;
END; $$;

CREATE OR REPLACE FUNCTION is_user_muted(p_muter_id uuid, p_muted_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM mutes WHERE muter_id = p_muter_id AND muted_id = p_muted_id);
END; $$;

-- ══════════════════════════════════════
-- Remove follower RPC (Instagram-style silent removal)
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION remove_follower(p_user_id uuid, p_follower_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row_count integer;
BEGIN
  -- Delete the follow where follower_id is the person being removed
  DELETE FROM follows WHERE follower_id = p_follower_id AND following_id = p_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    -- Decrement counters
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = p_user_id;
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = p_follower_id;
  END IF;
  -- No notification sent (silent removal, Instagram pattern)
END; $$;

COMMIT;

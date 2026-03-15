-- Push token on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expo_push_token text;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,  -- 'energia', 'comment'
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id) WHERE read = false;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone authenticated can insert (to notify others)
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger: notify on new comment
CREATE OR REPLACE FUNCTION notify_on_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id uuid;
  commenter_name text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM community_posts WHERE id = NEW.post_id;

  -- Don't notify yourself
  IF NEW.user_id = post_owner_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter name
  SELECT name INTO commenter_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, sender_id, type, title, body, data)
  VALUES (
    post_owner_id,
    NEW.user_id,
    'comment',
    'Novo comentário',
    coalesce(commenter_name, 'Alguém') || ' comentou no seu post',
    jsonb_build_object('post_id', NEW.post_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_comment ON post_comments;
CREATE TRIGGER on_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_post_comment();

-- Trigger: notify on energia (like)
CREATE OR REPLACE FUNCTION notify_on_energia()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id uuid;
  liker_name text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM community_posts WHERE id = NEW.post_id;

  -- Don't notify yourself
  IF NEW.user_id = post_owner_id THEN
    RETURN NEW;
  END IF;

  -- Get liker name
  SELECT name INTO liker_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, sender_id, type, title, body, data)
  VALUES (
    post_owner_id,
    NEW.user_id,
    'energia',
    'Nova energia!',
    coalesce(liker_name, 'Alguém') || ' deu energia no seu post',
    jsonb_build_object('post_id', NEW.post_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_energia ON post_reactions;
CREATE TRIGGER on_post_energia
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_energia();

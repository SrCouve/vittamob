BEGIN;

-- ══════════════════════════════════════
-- 1. Events table
-- ══════════════════════════════════════

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  organizer_name text NOT NULL,
  organizer_logo_url text,
  description text,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  distance_km numeric DEFAULT 0,
  image_url text,
  route_polyline text,
  spark_cost integer DEFAULT 0,
  spark_multiplier numeric DEFAULT 1.0,
  max_participants integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read events
CREATE POLICY "Authenticated can read events" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX idx_events_date ON public.events (event_date DESC);

-- ══════════════════════════════════════
-- 2. Event participants
-- ══════════════════════════════════════

CREATE TABLE public.event_participants (
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  confirmed_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read participants
CREATE POLICY "Authenticated can read event participants" ON public.event_participants
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own participation
CREATE POLICY "Users can confirm events" ON public.event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_event_participants_event ON public.event_participants (event_id);
CREATE INDEX idx_event_participants_user ON public.event_participants (user_id);

-- ══════════════════════════════════════
-- 3. Event comments
-- ══════════════════════════════════════

CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read event comments" ON public.event_comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can add event comments" ON public.event_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own event comments" ON public.event_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_event_comments_event ON public.event_comments (event_id, created_at DESC);

-- ══════════════════════════════════════
-- 4. Link runs to events (nullable)
-- ══════════════════════════════════════

ALTER TABLE public.strava_awarded_runs ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);
CREATE INDEX IF NOT EXISTS idx_runs_event ON public.strava_awarded_runs (event_id);

-- ══════════════════════════════════════
-- 5. RPCs
-- ══════════════════════════════════════

-- Confirm event: check sparks, debit, insert participant
CREATE OR REPLACE FUNCTION confirm_event(p_event_id uuid, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event record;
  v_balance integer;
  v_already boolean;
  v_count integer;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event IS NULL THEN
    RETURN json_build_object('error', 'event_not_found');
  END IF;

  -- Check if event is still active
  IF NOT v_event.is_active THEN
    RETURN json_build_object('error', 'event_closed');
  END IF;

  -- Check if already confirmed
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id) INTO v_already;
  IF v_already THEN
    RETURN json_build_object('error', 'already_confirmed');
  END IF;

  -- Check max participants
  IF v_event.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM event_participants WHERE event_id = p_event_id;
    IF v_count >= v_event.max_participants THEN
      RETURN json_build_object('error', 'event_full');
    END IF;
  END IF;

  -- Check spark balance
  IF v_event.spark_cost > 0 THEN
    SELECT points_balance INTO v_balance FROM profiles WHERE id = p_user_id;
    IF v_balance < v_event.spark_cost THEN
      RETURN json_build_object('error', 'insufficient_sparks', 'required', v_event.spark_cost, 'balance', v_balance);
    END IF;

    -- Debit sparks
    UPDATE profiles SET points_balance = points_balance - v_event.spark_cost WHERE id = p_user_id;
    INSERT INTO points_ledger (user_id, amount, reason)
    VALUES (p_user_id, -v_event.spark_cost, 'Inscricao: ' || v_event.title);
  END IF;

  -- Confirm participation
  INSERT INTO event_participants (event_id, user_id) VALUES (p_event_id, p_user_id);

  RETURN json_build_object('success', true, 'spark_cost', v_event.spark_cost, 'multiplier', v_event.spark_multiplier);
END; $$;

-- Get event details with participants (respecting privacy)
CREATE OR REPLACE FUNCTION get_event_details(p_event_id uuid, p_viewer_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event record;
  v_participants json;
  v_participant_count integer;
  v_viewer_confirmed boolean;
  v_comments json;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Count participants
  SELECT COUNT(*) INTO v_participant_count FROM event_participants WHERE event_id = p_event_id;

  -- Check if viewer is confirmed
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_viewer_id) INTO v_viewer_confirmed;

  -- Get participants with privacy check
  SELECT json_agg(row_to_json(t)) INTO v_participants FROM (
    SELECT
      ep.user_id,
      CASE WHEN p.is_private AND NOT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = ep.user_id
      ) AND ep.user_id != p_viewer_id
        THEN 'Participante privado'
        ELSE p.name
      END AS name,
      CASE WHEN p.is_private AND NOT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = ep.user_id
      ) AND ep.user_id != p_viewer_id
        THEN NULL
        ELSE p.avatar_url
      END AS avatar_url,
      p.is_private,
      p.is_verified,
      ep.confirmed_at
    FROM event_participants ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.event_id = p_event_id
    ORDER BY ep.confirmed_at ASC
    LIMIT 50
  ) t;

  RETURN json_build_object(
    'id', v_event.id,
    'title', v_event.title,
    'organizer_name', v_event.organizer_name,
    'organizer_logo_url', v_event.organizer_logo_url,
    'description', v_event.description,
    'event_date', v_event.event_date,
    'start_time', v_event.start_time,
    'end_time', v_event.end_time,
    'location', v_event.location,
    'distance_km', v_event.distance_km,
    'image_url', v_event.image_url,
    'route_polyline', v_event.route_polyline,
    'spark_cost', v_event.spark_cost,
    'spark_multiplier', v_event.spark_multiplier,
    'max_participants', v_event.max_participants,
    'is_active', v_event.is_active,
    'participant_count', v_participant_count,
    'viewer_confirmed', v_viewer_confirmed,
    'participants', COALESCE(v_participants, '[]'::json),
    'created_at', v_event.created_at
  );
END; $$;

-- ══════════════════════════════════════
-- 6. Fake event: Kurva Klub
-- ══════════════════════════════════════

INSERT INTO events (title, organizer_name, organizer_logo_url, description, event_date, start_time, end_time, location, distance_km, spark_cost, spark_multiplier, is_active)
VALUES (
  'Corrida Noturna Fortaleza',
  'Kurva Klub',
  NULL,
  'Corrida noturna pela orla de Fortaleza organizada pela Kurva Klub. Saída da Beira-Mar com percurso de 5km. Cada km gera 1.5 sparks para participantes confirmados!',
  '2026-03-22',
  '20:00',
  '22:00',
  'Beira-Mar, Fortaleza',
  5,
  2,
  1.5,
  true
);

COMMIT;

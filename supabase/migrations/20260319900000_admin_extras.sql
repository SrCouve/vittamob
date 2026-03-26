-- Daily new users for retention chart
CREATE OR REPLACE FUNCTION admin_get_daily_signups(p_days int DEFAULT 30)
RETURNS TABLE (day date, new_users bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT d.day::date, COUNT(p.id)::bigint AS new_users
  FROM generate_series(
    (now() - (p_days || ' days')::interval)::date,
    now()::date,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN profiles p ON p.created_at::date = d.day::date
  GROUP BY d.day
  ORDER BY d.day ASC;
END; $$;

-- Strava connection details
CREATE OR REPLACE FUNCTION admin_get_strava_users()
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  strava_athlete_id bigint,
  total_runs bigint,
  total_km numeric,
  last_run_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.name,
    p.avatar_url,
    sc.strava_athlete_id,
    COUNT(r.id)::bigint AS total_runs,
    COALESCE(SUM(r.distance_km), 0)::numeric AS total_km,
    MAX(r.created_at) AS last_run_at
  FROM strava_connections sc
  JOIN profiles p ON p.id = sc.user_id
  LEFT JOIN strava_awarded_runs r ON r.user_id = sc.user_id
  GROUP BY p.id, sc.strava_athlete_id
  ORDER BY total_km DESC;
END; $$;

-- Challenges table (if not exists)
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'distance', -- distance, streak, event
  target_value numeric NOT NULL DEFAULT 100,
  target_unit text NOT NULL DEFAULT 'km',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reward_sparks int DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read challenges" ON public.challenges
  FOR SELECT USING (auth.role() = 'authenticated');

-- Challenge participants
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  progress numeric DEFAULT 0,
  completed boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read challenge participants" ON public.challenge_participants
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join challenges" ON public.challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin: list challenges with participant count
CREATE OR REPLACE FUNCTION admin_get_challenges()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  target_value numeric,
  target_unit text,
  start_date date,
  end_date date,
  reward_sparks int,
  image_url text,
  is_active boolean,
  created_at timestamptz,
  participant_count bigint,
  completed_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.title, c.description, c.type, c.target_value, c.target_unit,
    c.start_date, c.end_date, c.reward_sparks, c.image_url, c.is_active, c.created_at,
    COUNT(cp.user_id)::bigint AS participant_count,
    COUNT(cp.user_id) FILTER (WHERE cp.completed)::bigint AS completed_count
  FROM challenges c
  LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
  GROUP BY c.id
  ORDER BY c.start_date DESC;
END; $$;

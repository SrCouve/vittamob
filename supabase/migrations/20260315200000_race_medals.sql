-- Race medals — earned when completing an official event/race
CREATE TABLE IF NOT EXISTS public.race_medals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  run_id uuid REFERENCES public.strava_awarded_runs(id) ON DELETE SET NULL,
  race_name text NOT NULL,
  race_date timestamptz NOT NULL,
  distance_km numeric(8,2) NOT NULL,
  moving_time_seconds integer NOT NULL DEFAULT 0,
  average_speed numeric(6,3) NOT NULL DEFAULT 0,
  medal_image_url text,          -- event medal image
  user_photo_url text,           -- user's photo from the race
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_race_medals_user ON public.race_medals (user_id, race_date DESC);

-- RLS
ALTER TABLE public.race_medals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own medals" ON public.race_medals;
CREATE POLICY "Users read own medals" ON public.race_medals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own medals" ON public.race_medals;
CREATE POLICY "Users insert own medals" ON public.race_medals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own medals" ON public.race_medals;
CREATE POLICY "Users update own medals" ON public.race_medals
  FOR UPDATE USING (auth.uid() = user_id);

-- Also allow reading other users' medals (public medal board)
DROP POLICY IF EXISTS "Anyone can view medals" ON public.race_medals;
CREATE POLICY "Anyone can view medals" ON public.race_medals
  FOR SELECT USING (true);

-- Allow anyone (including anon) to read medals
DROP POLICY IF EXISTS "Authenticated read medals" ON public.race_medals;

CREATE POLICY "Public read medals" ON public.race_medals
  FOR SELECT USING (true);

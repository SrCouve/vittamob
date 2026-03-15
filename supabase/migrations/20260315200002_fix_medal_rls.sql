-- Fix: simplify RLS - just allow authenticated users to read all medals
DROP POLICY IF EXISTS "Users read own medals" ON public.race_medals;
DROP POLICY IF EXISTS "Anyone can view medals" ON public.race_medals;

CREATE POLICY "Authenticated read medals" ON public.race_medals
  FOR SELECT USING (auth.role() = 'authenticated');

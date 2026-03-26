-- QA fixes for coach system

-- 1. Missing INSERT policy on coach_weekly_summaries (critical bug)
DROP POLICY IF EXISTS "Insert own summaries" ON public.coach_weekly_summaries;
CREATE POLICY "Insert own summaries" ON public.coach_weekly_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Missing UPDATE policy on coach_weekly_plans (for future use)
DROP POLICY IF EXISTS "Update own plans" ON public.coach_weekly_plans;
CREATE POLICY "Update own plans" ON public.coach_weekly_plans
  FOR UPDATE USING (auth.uid() = user_id);

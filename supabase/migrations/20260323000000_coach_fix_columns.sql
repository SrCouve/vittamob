-- Ensure all coach columns exist (these may have been added via ALTER TABLE before)
-- Using DO block to avoid errors if columns already exist

DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN goal_message text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN predicted_5k text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coach_profiles ADD COLUMN predicted_10k text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coach_weekly_plans ADD COLUMN weekly_meta jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Allow admin/service role to delete coach data (for re-onboarding)
DROP POLICY IF EXISTS "Users manage own coach profile" ON public.coach_profiles;
CREATE POLICY "Users manage own coach profile" ON public.coach_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Ensure delete policy exists for weekly plans
DROP POLICY IF EXISTS "Delete own plans" ON public.coach_weekly_plans;
CREATE POLICY "Delete own plans" ON public.coach_weekly_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Make event_date optional for "coming soon" events
ALTER TABLE public.events ALTER COLUMN event_date DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN end_time DROP NOT NULL;

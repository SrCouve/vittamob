-- Enable pg_cron extension (needed for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Reset weekly stats every Monday at 03:00 UTC (00:00 BRT)
SELECT cron.schedule(
  'reset-weekly-stats',
  '0 3 * * 1',  -- Every Monday at 03:00 UTC = 00:00 BRT
  $$
    UPDATE strava_stats_cache
    SET weekly_km = '[0,0,0,0,0,0,0]'::jsonb,
        weekly_total_km = 0,
        updated_at = now();
  $$
);

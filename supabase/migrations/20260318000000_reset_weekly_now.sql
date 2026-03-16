-- One-time reset: week already turned, force zero all weekly data now
UPDATE strava_stats_cache
SET weekly_km = '[0,0,0,0,0,0,0]'::jsonb,
    weekly_total_km = 0,
    updated_at = now();

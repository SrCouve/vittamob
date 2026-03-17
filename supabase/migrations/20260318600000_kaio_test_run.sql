-- Test run for Kaio to see weekly stats on home
INSERT INTO strava_awarded_runs (user_id, strava_activity_id, activity_name, activity_date, distance_km, moving_time_seconds, average_speed, sparks_awarded, workout_type, summary_polyline)
VALUES (
  'f2cafac2-1a52-4bff-8820-99ffa79b676c',
  99990020,
  'Corrida matinal',
  '2026-03-17T06:30:00',
  8.5,
  2700,
  3.15,
  8,
  0,
  'f|uUbcajFjCkMbBsNf@sNoAsNwBsNkCsNkCsN_DsNcBsNcBsNg@sN{@sNg@sN{@sNg@sN{@sNcBsNcBoKkCoK_DkH'
);

-- Also update strava_stats_cache so the weekly data shows
UPDATE strava_stats_cache
SET weekly_km = '[8.5, 0, 0, 0, 0, 0, 0]'::jsonb,
    weekly_total_km = 8.5,
    updated_at = now()
WHERE user_id = 'f2cafac2-1a52-4bff-8820-99ffa79b676c';

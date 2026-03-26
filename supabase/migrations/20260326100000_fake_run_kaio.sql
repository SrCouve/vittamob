-- Fake run for testing spark claim modal
INSERT INTO strava_awarded_runs (user_id, strava_activity_id, activity_date, distance_km, moving_time_seconds, average_speed, workout_type, sparks_awarded)
SELECT id, 9999999999, '2026-03-26', 7.2, 2520, 2.86, 0, 15
FROM profiles WHERE name ILIKE '%Kaio Jansen%'
LIMIT 1;

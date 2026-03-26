-- Remove ALL fake runs from Kaio (activity IDs that don't come from real Strava)
DELETE FROM strava_awarded_runs
WHERE user_id = (SELECT id FROM profiles WHERE name ILIKE '%Kaio Jansen%' LIMIT 1)
AND strava_activity_id >= 9999999000;

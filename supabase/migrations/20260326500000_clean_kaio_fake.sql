DELETE FROM strava_awarded_runs WHERE strava_activity_id = 9999999999;
UPDATE profiles SET last_seen_runs_at = NULL WHERE name ILIKE '%Kaio Jansen%';

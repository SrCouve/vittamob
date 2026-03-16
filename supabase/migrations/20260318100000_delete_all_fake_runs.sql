-- Delete all fake runs (strava_activity_id starting with 99990)
DELETE FROM strava_awarded_runs WHERE strava_activity_id >= 99990000 AND strava_activity_id <= 99999999;

-- Also clean any community posts that reference them
DELETE FROM community_posts WHERE type = 'run_complete' AND (metadata->>'strava_activity_id')::bigint >= 99990000;

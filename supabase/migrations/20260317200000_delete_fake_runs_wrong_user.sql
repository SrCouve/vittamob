-- Remove fake runs from wrong Kaio profile
DELETE FROM strava_awarded_runs WHERE strava_activity_id IN (99990001, 99990002, 99990003, 99990004, 99990005, 99990006);

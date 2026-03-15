-- Add workout_type column to track casual vs competitive runs
-- Strava workout_type: 0=default, 1=race, 2=long run, 3=workout/intervals
ALTER TABLE strava_awarded_runs ADD COLUMN IF NOT EXISTS workout_type INTEGER DEFAULT NULL;

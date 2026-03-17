-- Create fake Strava connection for Kaio so weekly goal shows
INSERT INTO strava_connections (user_id, strava_athlete_id, access_token, refresh_token, token_expires_at)
VALUES (
  'f2cafac2-1a52-4bff-8820-99ffa79b676c',
  99999,
  'fake_token',
  'fake_refresh',
  now() + interval '1 year'
) ON CONFLICT (user_id) DO NOTHING;

-- Create stats cache with weekly data
INSERT INTO strava_stats_cache (user_id, weekly_km, weekly_total_km, weekly_goal_km, lifetime_distance_m, lifetime_run_count, lifetime_moving_time_s, lifetime_elevation_m, avg_pace_mps, monthly_km)
VALUES (
  'f2cafac2-1a52-4bff-8820-99ffa79b676c',
  '[8.5, 0, 0, 0, 0, 0, 0]'::jsonb,
  8.5,
  20,
  45000,
  12,
  16200,
  320,
  3.15,
  '[{"month":"Jan","km":15},{"month":"Fev","km":22},{"month":"Mar","km":8.5}]'::jsonb
) ON CONFLICT (user_id) DO UPDATE SET
  weekly_km = '[8.5, 0, 0, 0, 0, 0, 0]'::jsonb,
  weekly_total_km = 8.5,
  updated_at = now();

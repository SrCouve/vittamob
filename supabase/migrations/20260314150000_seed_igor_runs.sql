-- Seed fake runs for Igor De Sousa
INSERT INTO strava_awarded_runs (user_id, strava_activity_id, activity_name, activity_date, distance_km, moving_time_seconds, average_speed, sparks_awarded)
VALUES
  ('cc6cafd8-28dd-4632-b6bd-9ad9d25d7e4a', 9900100001, 'Corrida matinal no parque', '2026-03-12T07:30:00Z', 5.42, 1820, 2.98, 5),
  ('cc6cafd8-28dd-4632-b6bd-9ad9d25d7e4a', 9900100002, 'Treino intervalado', '2026-03-10T18:15:00Z', 8.15, 2730, 2.99, 8)
ON CONFLICT (user_id, strava_activity_id) DO NOTHING;

-- Seed: fake run for Kaio Jansen to test the corridas screen
-- This bypasses RLS because migrations run as superuser

INSERT INTO strava_awarded_runs (user_id, strava_activity_id, distance_km, sparks_awarded, activity_name, activity_date, moving_time_seconds, average_speed)
VALUES
  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 9999000001, 8.52, 8, 'Corrida matinal no parque', '2026-03-13T07:30:00-03:00', 2700, 3.16),
  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 9999000002, 5.10, 5, 'Corrida leve pós-treino', '2026-03-12T18:15:00-03:00', 1800, 2.83),
  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 9999000003, 10.03, 10, 'Longão de domingo', '2026-03-09T06:00:00-03:00', 3300, 3.04)
ON CONFLICT (user_id, strava_activity_id) DO NOTHING;

-- Award 23 sparks (8+5+10)
INSERT INTO points_ledger (user_id, amount, type, description)
VALUES ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 23, 'strava_run', '+23 sparks por 3 corridas');

-- Update points balance
UPDATE profiles SET points_balance = points_balance + 23 WHERE id = 'f2cafac2-1a52-4bff-8820-99ffa79b676c';

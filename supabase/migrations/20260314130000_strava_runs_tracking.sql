-- ============================================
-- Track Strava runs that were already awarded sparks
-- Prevents double-awarding on re-sync
-- ============================================

CREATE TABLE IF NOT EXISTS strava_awarded_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL,
  distance_km NUMERIC(8, 2) NOT NULL,
  sparks_awarded INTEGER NOT NULL,
  activity_name TEXT,
  activity_date TIMESTAMPTZ NOT NULL,
  moving_time_seconds INTEGER DEFAULT 0,
  average_speed NUMERIC(6, 3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strava_activity_id)
);

CREATE INDEX idx_strava_awarded_runs_user ON strava_awarded_runs(user_id, activity_date DESC);

-- RLS
ALTER TABLE strava_awarded_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own runs" ON strava_awarded_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs" ON strava_awarded_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do anything (for edge functions)
CREATE POLICY "Service role full access runs" ON strava_awarded_runs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

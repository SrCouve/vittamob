-- ══════════════════════════════════════
-- Strava Integration Tables for VITTA UP
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════

-- 1. Strava OAuth connections (one per user)
CREATE TABLE IF NOT EXISTS strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strava_athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT,
  athlete_firstname TEXT,
  athlete_lastname TEXT,
  athlete_profile_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Cached stats (avoid hitting Strava API on every profile view)
CREATE TABLE IF NOT EXISTS strava_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_km JSONB DEFAULT '[0,0,0,0,0,0,0]',
  weekly_total_km NUMERIC DEFAULT 0,
  weekly_goal_km NUMERIC DEFAULT 20,
  lifetime_distance_m NUMERIC DEFAULT 0,
  lifetime_run_count INTEGER DEFAULT 0,
  lifetime_moving_time_s INTEGER DEFAULT 0,
  lifetime_elevation_m NUMERIC DEFAULT 0,
  avg_pace_mps NUMERIC DEFAULT 0,
  monthly_km JSONB DEFAULT '[]',
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_stats_cache ENABLE ROW LEVEL SECURITY;

-- Users can only access their own Strava data
CREATE POLICY "Users can view own strava connection"
  ON strava_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strava connection"
  ON strava_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strava connection"
  ON strava_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strava connection"
  ON strava_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Stats cache
CREATE POLICY "Users can view own strava stats"
  ON strava_stats_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strava stats"
  ON strava_stats_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strava stats"
  ON strava_stats_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strava stats"
  ON strava_stats_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Service role needs access for Edge Functions
CREATE POLICY "Service role full access strava_connections"
  ON strava_connections FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access strava_stats_cache"
  ON strava_stats_cache FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER strava_connections_updated_at
  BEFORE UPDATE ON strava_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER strava_stats_cache_updated_at
  BEFORE UPDATE ON strava_stats_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Get all user IDs with strava connection
CREATE OR REPLACE FUNCTION admin_get_strava_user_ids()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT json_agg(user_id) FROM strava_connections);
END; $$;

-- Get all user IDs with coach profile
CREATE OR REPLACE FUNCTION admin_get_coach_user_ids()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT json_agg(user_id) FROM coach_profiles);
END; $$;

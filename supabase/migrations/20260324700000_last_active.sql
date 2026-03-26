-- Track user online status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Admin RPC to count online users (active in last 5 min)
CREATE OR REPLACE FUNCTION admin_get_online_count()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM profiles WHERE last_active_at >= now() - interval '5 minutes');
END; $$;

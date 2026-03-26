-- ══════════════════════════════════════════════════════════
-- Admin Dashboard RPCs (SECURITY DEFINER)
-- ══════════════════════════════════════════════════════════

-- 1. Overview stats: single JSON blob with all key metrics
CREATE OR REPLACE FUNCTION admin_overview_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_users        bigint;
  v_new_users_7d       bigint;
  v_new_users_30d      bigint;
  v_sparks_earned      bigint;
  v_sparks_spent       bigint;
  v_total_runs         bigint;
  v_total_km           numeric;
  v_total_events       bigint;
  v_active_events      bigint;
  v_total_posts        bigint;
  v_total_comments     bigint;
  v_strava_connected   bigint;
  v_total_follows      bigint;
  v_verified_users     bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM profiles;

  SELECT COUNT(*) INTO v_new_users_7d
    FROM profiles WHERE created_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO v_new_users_30d
    FROM profiles WHERE created_at >= now() - interval '30 days';

  SELECT COALESCE(SUM(amount), 0) INTO v_sparks_earned
    FROM points_ledger WHERE amount > 0;

  SELECT COALESCE(ABS(SUM(amount)), 0) INTO v_sparks_spent
    FROM points_ledger WHERE amount < 0;

  SELECT COUNT(*), COALESCE(SUM(distance_km), 0)
    INTO v_total_runs, v_total_km
    FROM strava_awarded_runs;

  SELECT COUNT(*) INTO v_total_events FROM events;

  SELECT COUNT(*) INTO v_active_events
    FROM events WHERE is_active = true;

  SELECT COUNT(*) INTO v_total_posts FROM community_posts;

  SELECT COUNT(*) INTO v_total_comments FROM post_comments;

  SELECT COUNT(*) INTO v_strava_connected FROM strava_connections;

  SELECT COUNT(*) INTO v_total_follows FROM follows;

  SELECT COUNT(*) INTO v_verified_users
    FROM profiles WHERE is_verified = true;

  RETURN json_build_object(
    'total_users',              v_total_users,
    'new_users_7d',             v_new_users_7d,
    'new_users_30d',            v_new_users_30d,
    'total_sparks_earned',      v_sparks_earned,
    'total_sparks_spent',       v_sparks_spent,
    'total_runs',               v_total_runs,
    'total_km',                 v_total_km,
    'total_events',             v_total_events,
    'active_events',            v_active_events,
    'total_posts',              v_total_posts,
    'total_comments',           v_total_comments,
    'strava_connected_users',   v_strava_connected,
    'total_followers_connections', v_total_follows,
    'verified_users_count',     v_verified_users
  );
END; $$;


-- 2. Paginated user list with aggregated stats, searchable by name
CREATE OR REPLACE FUNCTION admin_get_users(
  p_limit  int  DEFAULT 50,
  p_offset int  DEFAULT 0,
  p_search text DEFAULT ''
)
RETURNS TABLE (
  id               uuid,
  name             text,
  avatar_url       text,
  bio              text,
  points_balance   int,
  streak_days      int,
  total_lessons    int,
  total_hours      numeric,
  subscription_tier text,
  is_private       boolean,
  is_verified      boolean,
  followers_count  int,
  following_count  int,
  created_at       timestamptz,
  total_km         numeric,
  total_sparks     bigint,
  run_count        bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.avatar_url,
    p.bio,
    p.points_balance,
    p.streak_days,
    p.total_lessons,
    p.total_hours,
    p.subscription_tier,
    p.is_private,
    p.is_verified,
    p.followers_count,
    p.following_count,
    p.created_at,
    COALESCE(SUM(r.distance_km), 0)::numeric   AS total_km,
    COALESCE(SUM(CASE WHEN pl.amount > 0 THEN pl.amount ELSE 0 END), 0)::bigint AS total_sparks,
    COUNT(DISTINCT r.id)::bigint                AS run_count
  FROM profiles p
  LEFT JOIN strava_awarded_runs r  ON r.user_id = p.id
  LEFT JOIN points_ledger pl       ON pl.user_id = p.id
  WHERE (p_search = '' OR p.name ILIKE '%' || p_search || '%')
  GROUP BY p.id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END; $$;


-- 3. Daily economy breakdown for charts (sparks earned vs spent per day)
CREATE OR REPLACE FUNCTION admin_get_economy_daily(p_days int DEFAULT 30)
RETURNS TABLE (
  day           date,
  sparks_earned bigint,
  sparks_spent  bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.day::date,
    COALESCE(SUM(CASE WHEN pl.amount > 0 THEN pl.amount ELSE 0 END), 0)::bigint AS sparks_earned,
    COALESCE(ABS(SUM(CASE WHEN pl.amount < 0 THEN pl.amount ELSE 0 END)), 0)::bigint AS sparks_spent
  FROM generate_series(
    (now() - (p_days || ' days')::interval)::date,
    now()::date,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN points_ledger pl ON pl.created_at::date = d.day::date
  GROUP BY d.day
  ORDER BY d.day ASC;
END; $$;


-- 4. Top runners by total km
CREATE OR REPLACE FUNCTION admin_get_top_runners(p_limit int DEFAULT 20)
RETURNS TABLE (
  user_id      uuid,
  name         text,
  avatar_url   text,
  is_verified  boolean,
  total_km     numeric,
  run_count    bigint,
  avg_pace_sec numeric
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id                                          AS user_id,
    p.name,
    p.avatar_url,
    p.is_verified,
    COALESCE(SUM(r.distance_km), 0)::numeric     AS total_km,
    COUNT(r.id)::bigint                           AS run_count,
    CASE
      WHEN SUM(r.distance_km) > 0
        THEN (SUM(r.moving_time_seconds) / SUM(r.distance_km))::numeric
      ELSE 0
    END                                           AS avg_pace_sec
  FROM profiles p
  INNER JOIN strava_awarded_runs r ON r.user_id = p.id
  GROUP BY p.id
  ORDER BY total_km DESC
  LIMIT p_limit;
END; $$;


-- 5. Event stats: each event with its participant count
CREATE OR REPLACE FUNCTION admin_get_event_stats()
RETURNS TABLE (
  id                uuid,
  title             text,
  organizer_name    text,
  event_date        date,
  location          text,
  distance_km       numeric,
  spark_cost        int,
  spark_multiplier  numeric,
  max_participants  int,
  is_active         boolean,
  created_at        timestamptz,
  participant_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.organizer_name,
    e.event_date,
    e.location,
    e.distance_km,
    e.spark_cost,
    e.spark_multiplier,
    e.max_participants,
    e.is_active,
    e.created_at,
    COUNT(ep.user_id)::bigint AS participant_count
  FROM events e
  LEFT JOIN event_participants ep ON ep.event_id = e.id
  GROUP BY e.id
  ORDER BY e.event_date DESC;
END; $$;


-- 6. Toggle verified badge on a user
CREATE OR REPLACE FUNCTION admin_set_verified(p_user_id uuid, p_verified boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
    SET is_verified = p_verified
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'user_not_found');
  END IF;

  RETURN json_build_object(
    'success',     true,
    'user_id',     p_user_id,
    'is_verified', p_verified
  );
END; $$;

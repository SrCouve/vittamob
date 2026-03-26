-- Home: get active events with first 4 participant avatars + count
CREATE OR REPLACE FUNCTION get_home_events()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result FROM (
    SELECT
      e.id, e.title, e.organizer_name, e.organizer_logo_url,
      e.organizer_instagram, e.organizer_website,
      e.description, e.image_url, e.event_date, e.start_time,
      e.location, e.distance_km, e.spark_cost, e.spark_multiplier,
      (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) AS participant_count,
      (
        SELECT json_agg(json_build_object('avatar_url', p.avatar_url, 'name', p.name))
        FROM (
          SELECT pr.avatar_url, pr.name
          FROM event_participants ep
          JOIN profiles pr ON pr.id = ep.user_id
          WHERE ep.event_id = e.id
          ORDER BY ep.confirmed_at ASC
          LIMIT 4
        ) p
      ) AS participant_avatars
    FROM events e
    WHERE e.is_active = true
    ORDER BY e.event_date ASC
    LIMIT 5
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END; $$;

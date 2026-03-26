-- Return all event fields including organizer socials, description, image
DROP FUNCTION IF EXISTS admin_get_event_stats();
CREATE OR REPLACE FUNCTION admin_get_event_stats()
RETURNS TABLE (
  id                  uuid,
  title               text,
  organizer_name      text,
  organizer_logo_url  text,
  organizer_website   text,
  organizer_instagram text,
  description         text,
  image_url           text,
  event_date          date,
  start_time          time,
  end_time            time,
  location            text,
  distance_km         numeric,
  spark_cost          int,
  spark_multiplier    numeric,
  max_participants    int,
  is_active           boolean,
  created_at          timestamptz,
  participant_count   bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.title, e.organizer_name, e.organizer_logo_url,
    e.organizer_website, e.organizer_instagram,
    e.description, e.image_url,
    e.event_date, e.start_time, e.end_time,
    e.location, e.distance_km, e.spark_cost, e.spark_multiplier,
    e.max_participants, e.is_active, e.created_at,
    COUNT(ep.user_id)::bigint AS participant_count
  FROM events e
  LEFT JOIN event_participants ep ON ep.event_id = e.id
  GROUP BY e.id
  ORDER BY e.event_date DESC;
END; $$;

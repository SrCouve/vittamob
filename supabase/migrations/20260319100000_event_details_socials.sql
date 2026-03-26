-- Update get_event_details to return organizer_website and organizer_instagram

CREATE OR REPLACE FUNCTION get_event_details(p_event_id uuid, p_viewer_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event record;
  v_participants json;
  v_participant_count integer;
  v_viewer_confirmed boolean;
  v_comments json;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Count participants
  SELECT COUNT(*) INTO v_participant_count FROM event_participants WHERE event_id = p_event_id;

  -- Check if viewer is confirmed
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_viewer_id) INTO v_viewer_confirmed;

  -- Get participants with privacy check
  SELECT json_agg(row_to_json(t)) INTO v_participants FROM (
    SELECT
      ep.user_id,
      CASE WHEN p.is_private AND NOT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = ep.user_id
      ) AND ep.user_id != p_viewer_id
        THEN 'Participante privado'
        ELSE p.name
      END AS name,
      CASE WHEN p.is_private AND NOT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = ep.user_id
      ) AND ep.user_id != p_viewer_id
        THEN NULL
        ELSE p.avatar_url
      END AS avatar_url,
      p.is_private,
      p.is_verified,
      ep.confirmed_at
    FROM event_participants ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.event_id = p_event_id
    ORDER BY ep.confirmed_at ASC
    LIMIT 50
  ) t;

  RETURN json_build_object(
    'id', v_event.id,
    'title', v_event.title,
    'organizer_name', v_event.organizer_name,
    'organizer_logo_url', v_event.organizer_logo_url,
    'organizer_website', v_event.organizer_website,
    'organizer_instagram', v_event.organizer_instagram,
    'description', v_event.description,
    'event_date', v_event.event_date,
    'start_time', v_event.start_time,
    'end_time', v_event.end_time,
    'location', v_event.location,
    'distance_km', v_event.distance_km,
    'image_url', v_event.image_url,
    'route_polyline', v_event.route_polyline,
    'spark_cost', v_event.spark_cost,
    'spark_multiplier', v_event.spark_multiplier,
    'max_participants', v_event.max_participants,
    'is_active', v_event.is_active,
    'participant_count', v_participant_count,
    'viewer_confirmed', v_viewer_confirmed,
    'participants', COALESCE(v_participants, '[]'::json),
    'created_at', v_event.created_at
  );
END; $$;

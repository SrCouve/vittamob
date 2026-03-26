ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_url text;

-- Update get_event_details to include location_url
CREATE OR REPLACE FUNCTION get_event_details(p_event_id uuid, p_viewer_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event record;
  v_participants json;
  v_participant_count integer;
  v_viewer_confirmed boolean;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  SELECT COUNT(*) INTO v_participant_count FROM event_participants WHERE event_id = p_event_id;
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_viewer_id) INTO v_viewer_confirmed;

  SELECT json_agg(row_to_json(t)) INTO v_participants FROM (
    SELECT ep.user_id,
      CASE WHEN p.is_private AND NOT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = ep.user_id
      ) AND ep.user_id != p_viewer_id THEN 'Participante privado' ELSE p.name END AS name,
      CASE WHEN p.is_private AND NOT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = ep.user_id
      ) AND ep.user_id != p_viewer_id THEN NULL ELSE p.avatar_url END AS avatar_url,
      p.is_private, p.is_verified, ep.confirmed_at
    FROM event_participants ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.event_id = p_event_id
    ORDER BY ep.confirmed_at ASC LIMIT 50
  ) t;

  RETURN json_build_object(
    'id', v_event.id, 'title', v_event.title,
    'organizer_name', v_event.organizer_name, 'organizer_logo_url', v_event.organizer_logo_url,
    'organizer_website', v_event.organizer_website, 'organizer_instagram', v_event.organizer_instagram,
    'description', v_event.description,
    'event_date', v_event.event_date, 'start_time', v_event.start_time, 'end_time', v_event.end_time,
    'location', v_event.location, 'location_url', v_event.location_url,
    'distance_km', v_event.distance_km, 'image_url', v_event.image_url,
    'route_polyline', v_event.route_polyline,
    'spark_cost', v_event.spark_cost, 'spark_multiplier', v_event.spark_multiplier,
    'max_participants', v_event.max_participants, 'is_active', v_event.is_active,
    'participant_count', v_participant_count, 'viewer_confirmed', v_viewer_confirmed,
    'participants', COALESCE(v_participants, '[]'::json),
    'created_at', v_event.created_at
  );
END; $$;

-- Update admin upsert to include location_url
CREATE OR REPLACE FUNCTION admin_upsert_event(
  p_id uuid DEFAULT NULL, p_title text DEFAULT '', p_organizer_name text DEFAULT '',
  p_organizer_logo_url text DEFAULT NULL, p_organizer_website text DEFAULT NULL,
  p_organizer_instagram text DEFAULT NULL, p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL, p_event_date date DEFAULT CURRENT_DATE,
  p_start_time time DEFAULT '08:00', p_end_time time DEFAULT '10:00',
  p_location text DEFAULT NULL, p_location_url text DEFAULT NULL,
  p_distance_km numeric DEFAULT 5, p_spark_cost int DEFAULT 0,
  p_spark_multiplier numeric DEFAULT 1, p_max_participants int DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE events SET title=p_title, organizer_name=p_organizer_name,
      organizer_logo_url=p_organizer_logo_url, organizer_website=p_organizer_website,
      organizer_instagram=p_organizer_instagram, description=p_description,
      image_url=p_image_url, event_date=p_event_date, start_time=p_start_time, end_time=p_end_time,
      location=p_location, location_url=p_location_url, distance_km=p_distance_km,
      spark_cost=p_spark_cost, spark_multiplier=p_spark_multiplier,
      max_participants=p_max_participants, is_active=p_is_active
    WHERE id=p_id; v_id:=p_id;
  ELSE
    INSERT INTO events (title,organizer_name,organizer_logo_url,organizer_website,
      organizer_instagram,description,image_url,event_date,start_time,end_time,
      location,location_url,distance_km,spark_cost,spark_multiplier,max_participants,is_active)
    VALUES (p_title,p_organizer_name,p_organizer_logo_url,p_organizer_website,
      p_organizer_instagram,p_description,p_image_url,p_event_date,p_start_time,p_end_time,
      p_location,p_location_url,p_distance_km,p_spark_cost,p_spark_multiplier,p_max_participants,p_is_active)
    RETURNING id INTO v_id;
  END IF;
  RETURN json_build_object('success', true, 'id', v_id);
END; $$;

-- Update home events RPC
CREATE OR REPLACE FUNCTION get_home_events()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result FROM (
    SELECT e.id, e.title, e.organizer_name, e.organizer_logo_url,
      e.organizer_instagram, e.organizer_website,
      e.description, e.image_url, e.event_date, e.start_time,
      e.location, e.location_url, e.distance_km, e.spark_cost, e.spark_multiplier,
      (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) AS participant_count,
      (SELECT json_agg(json_build_object('avatar_url', p.avatar_url, 'name', p.name))
       FROM (SELECT pr.avatar_url, pr.name FROM event_participants ep
             JOIN profiles pr ON pr.id = ep.user_id WHERE ep.event_id = e.id
             ORDER BY ep.confirmed_at ASC LIMIT 4) p
      ) AS participant_avatars
    FROM events e WHERE e.is_active = true ORDER BY e.event_date ASC LIMIT 5
  ) t;
  RETURN COALESCE(v_result, '[]'::json);
END; $$;

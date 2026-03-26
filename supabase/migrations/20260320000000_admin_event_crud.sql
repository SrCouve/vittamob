-- Admin: create/update events (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_upsert_event(
  p_id uuid DEFAULT NULL,
  p_title text DEFAULT '',
  p_organizer_name text DEFAULT '',
  p_organizer_logo_url text DEFAULT NULL,
  p_organizer_website text DEFAULT NULL,
  p_organizer_instagram text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_event_date date DEFAULT CURRENT_DATE,
  p_start_time time DEFAULT '08:00',
  p_end_time time DEFAULT '10:00',
  p_location text DEFAULT NULL,
  p_distance_km numeric DEFAULT 5,
  p_spark_cost int DEFAULT 0,
  p_spark_multiplier numeric DEFAULT 1,
  p_max_participants int DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE events SET
      title = p_title, organizer_name = p_organizer_name,
      organizer_logo_url = p_organizer_logo_url, organizer_website = p_organizer_website,
      organizer_instagram = p_organizer_instagram, description = p_description,
      image_url = p_image_url, event_date = p_event_date,
      start_time = p_start_time, end_time = p_end_time,
      location = p_location, distance_km = p_distance_km,
      spark_cost = p_spark_cost, spark_multiplier = p_spark_multiplier,
      max_participants = p_max_participants, is_active = p_is_active
    WHERE id = p_id;
    v_id := p_id;
  ELSE
    INSERT INTO events (title, organizer_name, organizer_logo_url, organizer_website,
      organizer_instagram, description, image_url, event_date, start_time, end_time,
      location, distance_km, spark_cost, spark_multiplier, max_participants, is_active)
    VALUES (p_title, p_organizer_name, p_organizer_logo_url, p_organizer_website,
      p_organizer_instagram, p_description, p_image_url, p_event_date, p_start_time, p_end_time,
      p_location, p_distance_km, p_spark_cost, p_spark_multiplier, p_max_participants, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN json_build_object('success', true, 'id', v_id);
END; $$;

-- Admin: upsert challenge
CREATE OR REPLACE FUNCTION admin_upsert_challenge(
  p_id uuid DEFAULT NULL,
  p_title text DEFAULT '',
  p_description text DEFAULT NULL,
  p_type text DEFAULT 'distance',
  p_target_value numeric DEFAULT 100,
  p_target_unit text DEFAULT 'km',
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE + 30,
  p_reward_sparks int DEFAULT 10,
  p_image_url text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE challenges SET
      title = p_title, description = p_description, type = p_type,
      target_value = p_target_value, target_unit = p_target_unit,
      start_date = p_start_date, end_date = p_end_date,
      reward_sparks = p_reward_sparks, image_url = p_image_url, is_active = p_is_active
    WHERE id = p_id;
    v_id := p_id;
  ELSE
    INSERT INTO challenges (title, description, type, target_value, target_unit,
      start_date, end_date, reward_sparks, image_url, is_active)
    VALUES (p_title, p_description, p_type, p_target_value, p_target_unit,
      p_start_date, p_end_date, p_reward_sparks, p_image_url, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN json_build_object('success', true, 'id', v_id);
END; $$;

-- Storage bucket for admin uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read event images
CREATE POLICY "Public read event images" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

-- Allow uploads via service role (admin dashboard) or authenticated
CREATE POLICY "Admin upload event images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Admin update event images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'event-images');

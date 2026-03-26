-- Quick post a run to community (used by watch app notification action)
CREATE OR REPLACE FUNCTION quick_post_run(p_user_id uuid, p_distance_km numeric, p_moving_time_seconds int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name text;
  v_pace text;
  v_time text;
  v_content text;
  v_post_id uuid;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = p_user_id;
  IF v_name IS NULL THEN RETURN json_build_object('error', 'user_not_found'); END IF;

  -- Format pace
  IF p_distance_km > 0 THEN
    v_pace := ROUND((p_moving_time_seconds / p_distance_km) / 60) || ':' ||
              LPAD(ROUND(MOD(p_moving_time_seconds / p_distance_km, 60))::text, 2, '0') || '/km';
  ELSE
    v_pace := '--';
  END IF;

  -- Format time
  IF p_moving_time_seconds >= 3600 THEN
    v_time := (p_moving_time_seconds / 3600) || 'h' || LPAD(((p_moving_time_seconds % 3600) / 60)::text, 2, '0') || 'min';
  ELSE
    v_time := (p_moving_time_seconds / 60) || 'min';
  END IF;

  v_content := ROUND(p_distance_km::numeric, 1) || 'km em ' || v_time || ' (' || v_pace || ')';

  INSERT INTO community_posts (user_id, content, type)
  VALUES (p_user_id, v_content, 'run_complete')
  RETURNING id INTO v_post_id;

  RETURN json_build_object('success', true, 'post_id', v_post_id);
END; $$;

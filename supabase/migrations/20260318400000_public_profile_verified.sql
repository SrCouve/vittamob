-- Add is_verified to get_user_public_profile response
CREATE OR REPLACE FUNCTION public.get_user_public_profile(p_viewer_id uuid, p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_relationship json;
  v_blocked_by_target boolean;
  v_has_strava boolean;
BEGIN
  v_blocked_by_target := EXISTS (
    SELECT 1 FROM public.blocks WHERE blocker_id = p_target_id AND blocked_id = p_viewer_id
  );
  IF v_blocked_by_target THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  SELECT p.id, p.name, p.avatar_url, p.bio, p.interests, p.is_private, p.is_verified,
         p.points_balance, p.streak_days, p.total_lessons, p.total_hours,
         p.weight_kg, p.height_cm, p.hide_routes,
         p.followers_count, p.following_count, p.created_at
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_target_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  v_has_strava := EXISTS (
    SELECT 1 FROM public.strava_connections WHERE user_id = p_target_id
  );

  IF p_viewer_id = p_target_id THEN
    v_relationship := json_build_object('i_follow', false, 'they_follow', false, 'is_mutual', false, 'is_blocked', false, 'is_self', true);
  ELSE
    v_relationship := public.get_relationship_status(p_viewer_id, p_target_id);
  END IF;

  IF v_profile.is_private AND p_viewer_id != p_target_id
     AND NOT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p_target_id) THEN
    RETURN json_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'avatar_url', v_profile.avatar_url,
      'bio', v_profile.bio,
      'is_private', v_profile.is_private,
      'is_verified', v_profile.is_verified,
      'followers_count', v_profile.followers_count,
      'following_count', v_profile.following_count,
      'relationship', v_relationship,
      'limited', true
    );
  END IF;

  RETURN json_build_object(
    'id', v_profile.id,
    'name', v_profile.name,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'is_private', v_profile.is_private,
    'is_verified', v_profile.is_verified,
    'points_balance', v_profile.points_balance,
    'streak_days', v_profile.streak_days,
    'total_lessons', v_profile.total_lessons,
    'total_hours', v_profile.total_hours,
    'weight_kg', v_profile.weight_kg,
    'height_cm', v_profile.height_cm,
    'hide_routes', v_profile.hide_routes,
    'followers_count', v_profile.followers_count,
    'following_count', v_profile.following_count,
    'created_at', v_profile.created_at,
    'has_strava', v_has_strava,
    'relationship', v_relationship,
    'limited', false
  );
END; $$;

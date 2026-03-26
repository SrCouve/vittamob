-- Cancel event participation: remove participant, refund sparks
CREATE OR REPLACE FUNCTION cancel_event(p_event_id uuid, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event record;
  v_exists boolean;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event IS NULL THEN
    RETURN json_build_object('error', 'event_not_found');
  END IF;

  -- Check if user is a participant
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN json_build_object('error', 'not_confirmed');
  END IF;

  -- Remove participation
  DELETE FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Refund sparks if event had a cost
  IF v_event.spark_cost > 0 THEN
    UPDATE profiles SET points_balance = points_balance + v_event.spark_cost WHERE id = p_user_id;
    INSERT INTO points_ledger (user_id, amount, type, description)
    VALUES (p_user_id, v_event.spark_cost, 'event_refund', 'Cancelamento: ' || v_event.title);
  END IF;

  RETURN json_build_object('success', true, 'refunded', v_event.spark_cost);
END; $$;

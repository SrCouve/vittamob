-- Fix: points_ledger column is "description" not "reason"
CREATE OR REPLACE FUNCTION confirm_event(p_event_id uuid, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event record;
  v_balance integer;
  v_already boolean;
  v_count integer;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event IS NULL THEN
    RETURN json_build_object('error', 'event_not_found');
  END IF;

  IF NOT v_event.is_active THEN
    RETURN json_build_object('error', 'event_closed');
  END IF;

  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id) INTO v_already;
  IF v_already THEN
    RETURN json_build_object('error', 'already_confirmed');
  END IF;

  IF v_event.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM event_participants WHERE event_id = p_event_id;
    IF v_count >= v_event.max_participants THEN
      RETURN json_build_object('error', 'event_full');
    END IF;
  END IF;

  IF v_event.spark_cost > 0 THEN
    SELECT points_balance INTO v_balance FROM profiles WHERE id = p_user_id;
    IF v_balance IS NULL OR v_balance < v_event.spark_cost THEN
      RETURN json_build_object('error', 'insufficient_sparks', 'required', v_event.spark_cost, 'balance', COALESCE(v_balance, 0));
    END IF;

    UPDATE profiles SET points_balance = points_balance - v_event.spark_cost WHERE id = p_user_id;
    INSERT INTO points_ledger (user_id, amount, description)
    VALUES (p_user_id, -v_event.spark_cost, 'Inscricao: ' || v_event.title);
  END IF;

  INSERT INTO event_participants (event_id, user_id) VALUES (p_event_id, p_user_id);

  RETURN json_build_object('success', true, 'spark_cost', v_event.spark_cost, 'multiplier', v_event.spark_multiplier);
END; $$;

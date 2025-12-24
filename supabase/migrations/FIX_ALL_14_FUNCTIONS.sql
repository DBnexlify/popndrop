-- =============================================================================
-- 🚨 CRITICAL FIX: All 14 Functions Missing search_path
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. apply_promo_code
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  p_promo_code_id uuid, 
  p_booking_id uuid, 
  p_customer_id uuid, 
  p_original_amount numeric, 
  p_discount_applied numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.promo_code_usage (promo_code_id, booking_id, customer_id, original_amount, discount_applied, final_amount)
  VALUES (p_promo_code_id, p_booking_id, p_customer_id, p_original_amount, p_discount_applied, p_original_amount - p_discount_applied);
  
  UPDATE public.promo_codes SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = p_promo_code_id;
  
  UPDATE public.promo_codes SET status = 'used', updated_at = NOW()
  WHERE id = p_promo_code_id AND usage_limit IS NOT NULL AND usage_count >= usage_limit;
  
  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. calculate_window_end_times
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_window_end_times()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate delivery window end
  IF NEW.delivery_date IS NOT NULL AND NEW.delivery_window IS NOT NULL THEN
    NEW.delivery_window_end := public.get_delivery_window_end(NEW.delivery_date, NEW.delivery_window);
  END IF;
  
  -- Calculate pickup window end
  IF NEW.pickup_date IS NOT NULL AND NEW.pickup_window IS NOT NULL THEN
    NEW.pickup_window_end := public.get_pickup_window_end(NEW.pickup_date, NEW.pickup_window);
  END IF;
  
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. check_booking_automation_status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_booking_automation_status(booking_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_rec RECORD;
  result jsonb;
  needs_action boolean := false;
  action_type text;
  action_reason text;
  can_auto_complete boolean := false;
BEGIN
  -- Get booking with all relevant fields
  SELECT 
    b.*,
    COALESCE(b.deposit_paid, false) AS deposit_is_paid,
    COALESCE(b.balance_paid, false) AS balance_is_paid,
    (COALESCE(b.deposit_paid, false) AND COALESCE(b.balance_paid, false)) AS fully_paid,
    (COALESCE(b.deposit_paid, false) AND b.balance_due = 0) AS paid_in_full_at_checkout
  INTO booking_rec
  FROM public.bookings b
  WHERE b.id = booking_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found');
  END IF;
  
  -- Skip cancelled or completed bookings
  IF booking_rec.status IN ('cancelled', 'completed') THEN
    RETURN jsonb_build_object(
      'status', booking_rec.status,
      'needs_action', false,
      'can_auto_complete', false
    );
  END IF;
  
  -- Check if delivery window has passed for CONFIRMED bookings
  IF booking_rec.status = 'confirmed' 
     AND booking_rec.delivery_window_end IS NOT NULL
     AND booking_rec.delivery_window_end < now() THEN
    
    needs_action := true;
    action_type := 'delivery_confirmation';
    
    -- If fully paid via Stripe, can potentially auto-advance
    IF booking_rec.paid_in_full_at_checkout OR booking_rec.fully_paid THEN
      action_reason := 'Delivery window passed. Paid in full - confirm delivery?';
      can_auto_complete := true;
    ELSE
      action_reason := 'Delivery window passed. Payment needed - was this delivered?';
    END IF;
  END IF;
  
  -- Check if pickup window has passed for DELIVERED bookings
  IF booking_rec.status = 'delivered'
     AND booking_rec.pickup_window_end IS NOT NULL  
     AND booking_rec.pickup_window_end < now() THEN
    
    needs_action := true;
    action_type := 'pickup_confirmation';
    
    IF booking_rec.fully_paid OR booking_rec.paid_in_full_at_checkout THEN
      action_reason := 'Pickup window passed. Paid in full - confirm pickup?';
      can_auto_complete := true;
    ELSE
      action_reason := 'Pickup window passed. Balance due - was this picked up?';
    END IF;
  END IF;
  
  -- Check if PICKED_UP booking can be auto-completed
  IF booking_rec.status = 'picked_up' THEN
    IF booking_rec.fully_paid OR booking_rec.paid_in_full_at_checkout THEN
      needs_action := true;
      action_type := 'booking_closure';
      action_reason := 'Ready to complete - paid in full, pickup confirmed';
      can_auto_complete := true;
    ELSE
      needs_action := true;
      action_type := 'payment_collection';
      action_reason := 'Payment needed before completion';
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'booking_id', booking_uuid,
    'booking_number', booking_rec.booking_number,
    'status', booking_rec.status,
    'needs_action', needs_action,
    'action_type', action_type,
    'action_reason', action_reason,
    'can_auto_complete', can_auto_complete,
    'delivery_window_end', booking_rec.delivery_window_end,
    'pickup_window_end', booking_rec.pickup_window_end,
    'deposit_paid', booking_rec.deposit_is_paid,
    'balance_paid', booking_rec.balance_is_paid,
    'balance_due', booking_rec.balance_due,
    'checked_at', now()
  );
  
  RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. generate_promo_code
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_promo_code()
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code VARCHAR;
  v_exists BOOLEAN;
  v_chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i INTEGER;
BEGIN
  LOOP
    v_code := 'PND-';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.promo_codes WHERE code = v_code) INTO v_exists;
    IF NOT v_exists THEN RETURN v_code; END IF;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. get_bookings_needing_attention
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_bookings_needing_attention()
RETURNS TABLE(
  booking_id uuid, 
  booking_number text, 
  status booking_status, 
  action_type text, 
  action_reason text, 
  can_auto_complete boolean, 
  delivery_window_end timestamp with time zone, 
  pickup_window_end timestamp with time zone, 
  deposit_paid boolean, 
  balance_paid boolean, 
  balance_due numeric, 
  customer_name text, 
  product_name text, 
  event_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS booking_id,
    b.booking_number,
    b.status,
    CASE
      WHEN b.status = 'confirmed' AND b.delivery_window_end < now() THEN 'delivery_confirmation'
      WHEN b.status = 'delivered' AND b.pickup_window_end < now() THEN 'pickup_confirmation'
      WHEN b.status = 'picked_up' THEN 'booking_closure'
      ELSE 'manual_review'
    END AS action_type,
    CASE
      WHEN b.status = 'confirmed' AND b.delivery_window_end < now() THEN 'Delivery window passed'
      WHEN b.status = 'delivered' AND b.pickup_window_end < now() THEN 'Pickup window passed'
      WHEN b.status = 'picked_up' THEN 'Ready for completion'
      ELSE 'Needs review'
    END AS action_reason,
    CASE
      WHEN (COALESCE(b.deposit_paid, false) AND COALESCE(b.balance_paid, false)) 
           OR (COALESCE(b.deposit_paid, false) AND b.balance_due = 0) THEN true
      ELSE false
    END AS can_auto_complete,
    b.delivery_window_end,
    b.pickup_window_end,
    COALESCE(b.deposit_paid, false) AS deposit_paid,
    COALESCE(b.balance_paid, false) AS balance_paid,
    b.balance_due,
    c.first_name || ' ' || c.last_name AS customer_name,
    (b.product_snapshot->>'name')::text AS product_name,
    b.event_date
  FROM public.bookings b
  JOIN public.customers c ON c.id = b.customer_id
  WHERE b.status NOT IN ('cancelled', 'completed', 'pending')
    AND (
      -- Confirmed bookings past delivery window
      (b.status = 'confirmed' AND b.delivery_window_end < now())
      OR
      -- Delivered bookings past pickup window
      (b.status = 'delivered' AND b.pickup_window_end < now())
      OR
      -- Picked up bookings waiting for closure
      (b.status = 'picked_up')
    )
  ORDER BY 
    CASE b.status
      WHEN 'picked_up' THEN 1
      WHEN 'delivered' THEN 2
      WHEN 'confirmed' THEN 3
      ELSE 4
    END,
    COALESCE(b.delivery_window_end, b.pickup_window_end) ASC;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. get_delivery_window_end
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_delivery_window_end(delivery_date date, delivery_window text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  end_hour integer;
  result timestamptz;
BEGIN
  -- Map window text to end hour (Eastern time)
  end_hour := CASE delivery_window
    WHEN 'morning' THEN 11          -- 8-11 AM -> ends at 11 AM
    WHEN 'midday' THEN 14           -- 11 AM-2 PM -> ends at 2 PM
    WHEN 'afternoon' THEN 17        -- 2-5 PM -> ends at 5 PM
    WHEN 'saturday-evening' THEN 19 -- 5-7 PM -> ends at 7 PM
    ELSE 17                         -- Default to 5 PM
  END;
  
  -- Create timestamp in Eastern timezone, then convert to UTC for storage
  result := (delivery_date::text || ' ' || end_hour::text || ':00:00')::timestamp 
            AT TIME ZONE 'America/New_York';
  
  RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. get_notification_counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_notification_counts()
RETURNS TABLE(total bigint, unviewed bigint, urgent bigint, high bigint, medium bigint, low bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE viewed_at IS NULL)::bigint AS unviewed,
    COUNT(*) FILTER (WHERE priority = 'urgent')::bigint AS urgent,
    COUNT(*) FILTER (WHERE priority = 'high')::bigint AS high,
    COUNT(*) FILTER (WHERE priority = 'medium')::bigint AS medium,
    COUNT(*) FILTER (WHERE priority = 'low')::bigint AS low
  FROM public.attention_items
  WHERE status = 'pending'
    AND (snoozed_until IS NULL OR snoozed_until <= now());
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. get_pending_notifications
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pending_notifications(p_limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid, 
  booking_id uuid, 
  attention_type attention_type, 
  priority attention_priority, 
  status attention_status, 
  title text, 
  description text, 
  suggested_actions jsonb, 
  created_at timestamp with time zone, 
  viewed_at timestamp with time zone, 
  snoozed_until timestamp with time zone, 
  booking_number text, 
  customer_name text, 
  customer_phone text, 
  product_name text, 
  event_date date, 
  balance_due numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.booking_id,
    ai.attention_type,
    ai.priority,
    ai.status,
    ai.title,
    ai.description,
    ai.suggested_actions,
    ai.created_at,
    ai.viewed_at,
    ai.snoozed_until,
    b.booking_number,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.phone AS customer_phone,
    (b.product_snapshot->>'name')::text AS product_name,
    b.event_date,
    b.balance_due
  FROM public.attention_items ai
  JOIN public.bookings b ON b.id = ai.booking_id
  JOIN public.customers c ON c.id = b.customer_id
  WHERE ai.status = 'pending'
    AND (ai.snoozed_until IS NULL OR ai.snoozed_until <= now())
  ORDER BY 
    ai.priority DESC,
    ai.created_at ASC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. get_pickup_window_end
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pickup_window_end(pickup_date date, pickup_window text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  end_hour integer;
  result timestamptz;
BEGIN
  -- Map window text to end hour (Eastern time)
  end_hour := CASE pickup_window
    WHEN 'evening' THEN 20            -- 6-8 PM -> ends at 8 PM
    WHEN 'next-morning' THEN 10       -- by 10 AM next day -> ends at 10 AM
    WHEN 'monday-morning' THEN 10     -- by 10 AM Monday -> ends at 10 AM
    WHEN 'monday-afternoon' THEN 17   -- 2-5 PM Monday -> ends at 5 PM
    ELSE 20                           -- Default to 8 PM
  END;
  
  -- Create timestamp in Eastern timezone, then convert to UTC for storage
  result := (pickup_date::text || ' ' || end_hour::text || ':00:00')::timestamp 
            AT TIME ZONE 'America/New_York';
  
  RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10. mark_notification_viewed
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_viewed(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.attention_items
  SET viewed_at = now()
  WHERE id = p_id AND viewed_at IS NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- 11. snooze_notification
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snooze_notification(p_id uuid, p_duration interval DEFAULT '01:00:00'::interval)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snooze_time timestamptz;
BEGIN
  snooze_time := now() + p_duration;
  
  UPDATE public.attention_items
  SET snoozed_until = snooze_time
  WHERE id = p_id;
  
  RETURN snooze_time;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. update_promo_code_timestamp
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_promo_code_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 13. validate_promo_code
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code character varying, 
  p_customer_id uuid, 
  p_product_id uuid, 
  p_order_amount numeric
)
RETURNS TABLE(
  valid boolean, 
  error_message text, 
  promo_code_id uuid, 
  discount_type promo_discount_type, 
  discount_amount numeric, 
  max_discount_cap numeric, 
  calculated_discount numeric, 
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_customer_usage_count INTEGER;
  v_calculated_discount NUMERIC;
BEGIN
  p_code := UPPER(TRIM(p_code));
  
  SELECT * INTO v_promo FROM public.promo_codes WHERE UPPER(code) = p_code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Code not found'::TEXT, NULL::UUID,
      NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.status != 'active' THEN
    RETURN QUERY SELECT false, 
      CASE v_promo.status
        WHEN 'used' THEN 'This code has already been fully used'
        WHEN 'expired' THEN 'This code has expired'
        WHEN 'disabled' THEN 'This code is no longer valid'
      END::TEXT, NULL::UUID, NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.expiration_date IS NOT NULL AND v_promo.expiration_date < NOW() THEN
    UPDATE public.promo_codes SET status = 'expired', updated_at = NOW() WHERE id = v_promo.id;
    RETURN QUERY SELECT false, 'This code has expired'::TEXT, NULL::UUID,
      NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit THEN
    UPDATE public.promo_codes SET status = 'used', updated_at = NOW() WHERE id = v_promo.id;
    RETURN QUERY SELECT false, 'This code has reached its usage limit'::TEXT, NULL::UUID,
      NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.customer_id IS NOT NULL AND v_promo.customer_id != p_customer_id THEN
    RETURN QUERY SELECT false, 'This code is not valid for your account'::TEXT, NULL::UUID,
      NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.single_use_per_customer AND p_customer_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_usage_count
    FROM public.promo_code_usage WHERE promo_code_id = v_promo.id AND customer_id = p_customer_id;
    
    IF v_customer_usage_count > 0 THEN
      RETURN QUERY SELECT false, 'You have already used this code'::TEXT, NULL::UUID,
        NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  IF v_promo.minimum_order_amount IS NOT NULL AND p_order_amount < v_promo.minimum_order_amount THEN
    RETURN QUERY SELECT false, ('Minimum order of $' || v_promo.minimum_order_amount || ' required')::TEXT, NULL::UUID,
      NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.applicable_products IS NOT NULL AND p_product_id IS NOT NULL THEN
    IF NOT (p_product_id = ANY(v_promo.applicable_products)) THEN
      RETURN QUERY SELECT false, 'This code is not valid for the selected rental'::TEXT, NULL::UUID,
        NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  IF v_promo.excluded_products IS NOT NULL AND p_product_id IS NOT NULL THEN
    IF p_product_id = ANY(v_promo.excluded_products) THEN
      RETURN QUERY SELECT false, 'This code cannot be used with the selected rental'::TEXT, NULL::UUID,
        NULL::promo_discount_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  IF v_promo.discount_type = 'percent' THEN
    v_calculated_discount := p_order_amount * (v_promo.discount_amount / 100);
    IF v_promo.max_discount_cap IS NOT NULL AND v_calculated_discount > v_promo.max_discount_cap THEN
      v_calculated_discount := v_promo.max_discount_cap;
    END IF;
  ELSE
    v_calculated_discount := LEAST(v_promo.discount_amount, p_order_amount);
  END IF;
  
  v_calculated_discount := ROUND(v_calculated_discount, 2);
  
  RETURN QUERY SELECT true, NULL::TEXT, v_promo.id, v_promo.discount_type,
    v_promo.discount_amount, v_promo.max_discount_cap, v_calculated_discount, v_promo.description;
END;
$$;

-- =============================================================================
-- 🔐 GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.apply_promo_code(uuid, uuid, uuid, numeric, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_window_end_times() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_booking_automation_status(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_promo_code() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_bookings_needing_attention() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_delivery_window_end(date, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_notification_counts() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_notifications(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pickup_window_end(date, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_viewed(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.snooze_notification(uuid, interval) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_promo_code_timestamp() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(varchar, uuid, uuid, numeric) TO anon, authenticated, service_role;

-- =============================================================================
-- ✅ VERIFICATION
-- =============================================================================

SELECT 
  p.proname AS function_name,
  CASE WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' 
       THEN '✅ FIXED' 
       ELSE '❌ STILL BROKEN' 
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN (
    'apply_promo_code', 'calculate_window_end_times', 'check_booking_automation_status',
    'generate_promo_code', 'get_bookings_needing_attention', 'get_delivery_window_end',
    'get_notification_counts', 'get_pending_notifications', 'get_pickup_window_end',
    'mark_notification_viewed', 'snooze_notification', 'update_promo_code_timestamp',
    'validate_promo_code'
  )
ORDER BY p.proname;

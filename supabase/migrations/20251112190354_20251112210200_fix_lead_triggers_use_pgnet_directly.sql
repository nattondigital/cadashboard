/*
  # Fix Lead Triggers to Use pg_net Directly

  1. Changes
    - Remove INSERT INTO webhooks (wrong table)
    - Use pg_net.http_post directly like task triggers
    - Maintain WhatsApp followup functionality
    - Update api_webhooks statistics

  2. Notes
    - Follows same pattern as task triggers
    - Uses pg_net for webhook calls
    - Sends WhatsApp followups via send_followup_whatsapp()
*/

-- Function to handle lead created event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload jsonb;
  v_assigned_phone text;
  v_assigned_name text;
BEGIN
  -- Fetch assigned user phone and name from admin_users table using assigned_to
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_phone, v_assigned_name
    FROM admin_users WHERE id = NEW.assigned_to;
  END IF;

  -- Build the payload with all lead information
  payload := jsonb_build_object(
    'trigger_event', 'NEW_LEAD_ADDED',
    'id', NEW.id,
    'lead_id', NEW.lead_id,
    'name', NEW.name,
    'email', NEW.email,
    'phone', NEW.phone,
    'source', NEW.source,
    'interest', NEW.interest,
    'stage', NEW.stage,
    'owner', NEW.owner,
    'assigned_to', NEW.assigned_to,
    'assigned_to_name', COALESCE(v_assigned_name, NEW.owner, 'Unassigned'),
    'assigned_to_phone', v_assigned_phone,
    'address', NEW.address,
    'company', NEW.company,
    'notes', NEW.notes,
    'last_contact', NEW.last_contact,
    'lead_score', NEW.lead_score,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'affiliate_id', NEW.affiliate_id,
    'pipeline_id', NEW.pipeline_id,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  -- Process API Webhooks
  FOR webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'NEW_LEAD_ADDED' AND is_active = true
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := webhook_record.webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := payload
      );

      UPDATE api_webhooks
      SET last_triggered = NOW(),
          total_calls = COALESCE(total_calls, 0) + 1,
          success_count = COALESCE(success_count, 0) + 1
      WHERE id = webhook_record.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE api_webhooks
      SET total_calls = COALESCE(total_calls, 0) + 1,
          failure_count = COALESCE(failure_count, 0) + 1
      WHERE id = webhook_record.id;
    END;
  END LOOP;

  -- Send WhatsApp to lead's phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    PERFORM send_followup_whatsapp('NEW_LEAD_ADDED', NEW.phone, NEW.name, payload);
  END IF;

  -- Send WhatsApp to assigned user
  IF v_assigned_phone IS NOT NULL AND v_assigned_phone != '' AND v_assigned_phone != NEW.phone THEN
    PERFORM send_followup_whatsapp('NEW_LEAD_ADDED', v_assigned_phone, v_assigned_name, payload);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle lead updated event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_lead_update()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload jsonb;
  v_assigned_phone text;
  v_assigned_name text;
BEGIN
  -- Fetch assigned user phone and name from admin_users table using assigned_to
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_phone, v_assigned_name
    FROM admin_users WHERE id = NEW.assigned_to;
  END IF;

  -- Build the payload with all lead information
  payload := jsonb_build_object(
    'trigger_event', 'LEAD_UPDATED',
    'id', NEW.id,
    'lead_id', NEW.lead_id,
    'name', NEW.name,
    'email', NEW.email,
    'phone', NEW.phone,
    'source', NEW.source,
    'interest', NEW.interest,
    'stage', NEW.stage,
    'owner', NEW.owner,
    'assigned_to', NEW.assigned_to,
    'assigned_to_name', COALESCE(v_assigned_name, NEW.owner, 'Unassigned'),
    'assigned_to_phone', v_assigned_phone,
    'address', NEW.address,
    'company', NEW.company,
    'notes', NEW.notes,
    'last_contact', NEW.last_contact,
    'lead_score', NEW.lead_score,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'affiliate_id', NEW.affiliate_id,
    'pipeline_id', NEW.pipeline_id,
    'submission_date', to_char(NEW.updated_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
    'previous', jsonb_build_object(
      'stage', OLD.stage,
      'interest', OLD.interest,
      'owner', OLD.owner,
      'assigned_to', OLD.assigned_to,
      'notes', OLD.notes,
      'last_contact', OLD.last_contact,
      'lead_score', OLD.lead_score,
      'pipeline_id', OLD.pipeline_id
    )
  );

  -- Process API Webhooks
  FOR webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'LEAD_UPDATED' AND is_active = true
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := webhook_record.webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := payload
      );

      UPDATE api_webhooks
      SET last_triggered = NOW(),
          total_calls = COALESCE(total_calls, 0) + 1,
          success_count = COALESCE(success_count, 0) + 1
      WHERE id = webhook_record.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE api_webhooks
      SET total_calls = COALESCE(total_calls, 0) + 1,
          failure_count = COALESCE(failure_count, 0) + 1
      WHERE id = webhook_record.id;
    END;
  END LOOP;

  -- Send WhatsApp to lead's phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    PERFORM send_followup_whatsapp('LEAD_UPDATED', NEW.phone, NEW.name, payload);
  END IF;

  -- Send WhatsApp to assigned user
  IF v_assigned_phone IS NOT NULL AND v_assigned_phone != '' AND v_assigned_phone != NEW.phone THEN
    PERFORM send_followup_whatsapp('LEAD_UPDATED', v_assigned_phone, v_assigned_name, payload);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_lead_insert IS 'Sends webhooks and WhatsApp followups for NEW_LEAD_ADDED event (uses pg_net)';
COMMENT ON FUNCTION notify_lead_update IS 'Sends webhooks and WhatsApp followups for LEAD_UPDATED event (uses pg_net)';

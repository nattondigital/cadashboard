/*
  # Fix Lead Triggers to Use assigned_to Field

  1. Changes
    - Use assigned_to (uuid) instead of owner (text) for lookups
    - Keep owner as text name field in payload
    - Fetch assigned user's phone and name from admin_users using assigned_to

  2. Notes
    - assigned_to = UUID reference to admin_users
    - owner = Text name field (legacy)
*/

-- Function to handle lead created event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  v_assigned_phone text;
  v_assigned_name text;
BEGIN
  -- Fetch assigned user phone and name from admin_users table using assigned_to
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_phone, v_assigned_name
    FROM admin_users WHERE id = NEW.assigned_to;
  END IF;

  -- Build the trigger data payload with all lead information
  trigger_data := jsonb_build_object(
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
  FOR api_webhook_record IN
    SELECT webhook_url
    FROM api_webhooks
    WHERE is_active = true AND trigger_event = 'NEW_LEAD_ADDED'
  LOOP
    INSERT INTO webhooks (event, payload, url)
    VALUES ('NEW_LEAD_ADDED', trigger_data, api_webhook_record.webhook_url);
  END LOOP;

  -- Send WhatsApp to lead's phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    PERFORM send_followup_whatsapp('NEW_LEAD_ADDED', NEW.phone, NEW.name, trigger_data);
  END IF;

  -- Send WhatsApp to assigned user
  IF v_assigned_phone IS NOT NULL AND v_assigned_phone != '' AND v_assigned_phone != NEW.phone THEN
    PERFORM send_followup_whatsapp('NEW_LEAD_ADDED', v_assigned_phone, v_assigned_name, trigger_data);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle lead updated event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_lead_update()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  v_assigned_phone text;
  v_assigned_name text;
BEGIN
  -- Fetch assigned user phone and name from admin_users table using assigned_to
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_phone, v_assigned_name
    FROM admin_users WHERE id = NEW.assigned_to;
  END IF;

  -- Build the trigger data payload with all lead information
  trigger_data := jsonb_build_object(
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
  FOR api_webhook_record IN
    SELECT webhook_url
    FROM api_webhooks
    WHERE is_active = true AND trigger_event = 'LEAD_UPDATED'
  LOOP
    INSERT INTO webhooks (event, payload, url)
    VALUES ('LEAD_UPDATED', trigger_data, api_webhook_record.webhook_url);
  END LOOP;

  -- Send WhatsApp to lead's phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    PERFORM send_followup_whatsapp('LEAD_UPDATED', NEW.phone, NEW.name, trigger_data);
  END IF;

  -- Send WhatsApp to assigned user
  IF v_assigned_phone IS NOT NULL AND v_assigned_phone != '' AND v_assigned_phone != NEW.phone THEN
    PERFORM send_followup_whatsapp('LEAD_UPDATED', v_assigned_phone, v_assigned_name, trigger_data);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_lead_insert IS 'Sends webhooks and WhatsApp followups for NEW_LEAD_ADDED event (uses assigned_to field)';
COMMENT ON FUNCTION notify_lead_update IS 'Sends webhooks and WhatsApp followups for LEAD_UPDATED event (uses assigned_to field)';

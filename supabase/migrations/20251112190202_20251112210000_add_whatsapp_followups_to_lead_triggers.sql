/*
  # Add WhatsApp Followups to Lead Triggers

  1. Changes
    - Add WhatsApp followup functionality to lead triggers (NEW_LEAD_ADDED, LEAD_UPDATED)
    - Add owner phone and name lookup from admin_users table
    - Add Indian date/time format (DD-MM-YYYY, HH24:MI in Asia/Kolkata)
    - Add submission_date, current_date, current_time variables
    - Use send_followup_whatsapp() function for multiple template support

  2. Updated Functions
    - notify_lead_insert() - NEW_LEAD_ADDED trigger with WhatsApp followups
    - notify_lead_update() - LEAD_UPDATED trigger with WhatsApp followups

  3. WhatsApp Variables Available
    - {{lead_id}} - Lead ID
    - {{name}} - Lead name
    - {{email}} - Lead email
    - {{phone}} - Lead phone
    - {{source}} - Lead source
    - {{interest}} - Lead interest
    - {{stage}} - Lead stage
    - {{owner_name}} - Owner/assigned to name
    - {{owner_phone}} - Owner phone
    - {{company}} - Company name
    - {{address}} - Address
    - {{notes}} - Notes
    - {{lead_score}} - Lead score
    - {{current_date}} - Current date in DD-MM-YYYY format
    - {{current_time}} - Current time in HH24:MI format (IST)
    - {{submission_date}} - Creation/update date in DD-MM-YYYY HH24:MI format (IST)
*/

-- Function to handle lead created event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  v_owner_phone text;
  v_owner_name text;
BEGIN
  -- Fetch owner phone and name from admin_users table
  IF NEW.owner IS NOT NULL THEN
    SELECT phone, full_name INTO v_owner_phone, v_owner_name
    FROM admin_users WHERE id = NEW.owner;
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
    'owner_name', COALESCE(v_owner_name, 'Unassigned'),
    'owner_phone', v_owner_phone,
    'address', NEW.address,
    'company', NEW.company,
    'notes', NEW.notes,
    'last_contact', NEW.last_contact,
    'lead_score', NEW.lead_score,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'affiliate_id', NEW.affiliate_id,
    'pipeline_id', NEW.pipeline_id,
    'assigned_to', NEW.assigned_to,
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

  -- Send WhatsApp to owner (assigned person)
  IF v_owner_phone IS NOT NULL AND v_owner_phone != '' AND v_owner_phone != NEW.phone THEN
    PERFORM send_followup_whatsapp('NEW_LEAD_ADDED', v_owner_phone, v_owner_name, trigger_data);
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
  v_owner_phone text;
  v_owner_name text;
BEGIN
  -- Fetch owner phone and name from admin_users table
  IF NEW.owner IS NOT NULL THEN
    SELECT phone, full_name INTO v_owner_phone, v_owner_name
    FROM admin_users WHERE id = NEW.owner;
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
    'owner_name', COALESCE(v_owner_name, 'Unassigned'),
    'owner_phone', v_owner_phone,
    'address', NEW.address,
    'company', NEW.company,
    'notes', NEW.notes,
    'last_contact', NEW.last_contact,
    'lead_score', NEW.lead_score,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'affiliate_id', NEW.affiliate_id,
    'pipeline_id', NEW.pipeline_id,
    'assigned_to', NEW.assigned_to,
    'submission_date', to_char(NEW.updated_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
    'previous', jsonb_build_object(
      'stage', OLD.stage,
      'interest', OLD.interest,
      'owner', OLD.owner,
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

  -- Send WhatsApp to owner (assigned person)
  IF v_owner_phone IS NOT NULL AND v_owner_phone != '' AND v_owner_phone != NEW.phone THEN
    PERFORM send_followup_whatsapp('LEAD_UPDATED', v_owner_phone, v_owner_name, trigger_data);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
DROP TRIGGER IF EXISTS lead_insert_trigger ON leads;
DROP TRIGGER IF EXISTS lead_update_trigger ON leads;

CREATE TRIGGER lead_insert_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_insert();

CREATE TRIGGER lead_update_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_update();

COMMENT ON FUNCTION notify_lead_insert IS 'Sends webhooks and WhatsApp followups for NEW_LEAD_ADDED event';
COMMENT ON FUNCTION notify_lead_update IS 'Sends webhooks and WhatsApp followups for LEAD_UPDATED event';

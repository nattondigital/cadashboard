/*
  # Update lead triggers to remove owner field references

  1. Changes
    - Update notify_lead_insert to remove 'owner' from payload
    - Update notify_lead_update to remove 'owner' from payload and previous data
    - Update notify_lead_delete to remove 'owner' from payload
    - Update trigger_workflows_on_lead_insert to remove 'owner'
    - Update trigger_workflows_on_lead_update to remove 'owner'
    - Update trigger_workflows_on_lead_delete to remove 'owner'
    
  2. Notes
    - All triggers use assigned_to_name (from admin_users join) instead
    - This ensures consistency across all webhooks and workflows
*/

-- Update notify_lead_insert function
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
'assigned_to', NEW.assigned_to,
'assigned_to_name', COALESCE(v_assigned_name, 'Unassigned'),
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

-- Update notify_lead_update function
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
'assigned_to', NEW.assigned_to,
'assigned_to_name', COALESCE(v_assigned_name, 'Unassigned'),
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

-- Update notify_lead_delete function
CREATE OR REPLACE FUNCTION notify_lead_delete()
RETURNS TRIGGER AS $$
DECLARE
trigger_data jsonb;
api_webhook_record RECORD;
BEGIN
trigger_data := jsonb_build_object(
'trigger_event', 'lead.deleted',
'id', OLD.id,
'lead_id', OLD.lead_id,
'name', OLD.name,
'email', OLD.email,
'phone', OLD.phone,
'source', OLD.source,
'interest', OLD.interest,
'stage', OLD.stage,
'assigned_to', OLD.assigned_to,
'address', OLD.address,
'company', OLD.company,
'notes', OLD.notes,
'last_contact', OLD.last_contact,
'lead_score', OLD.lead_score,
'created_at', OLD.created_at,
'updated_at', OLD.updated_at,
'affiliate_id', OLD.affiliate_id,
'pipeline_id', OLD.pipeline_id
);

FOR api_webhook_record IN
SELECT webhook_url
FROM api_webhooks
WHERE is_active = true
AND trigger_event = 'lead.deleted'
LOOP
INSERT INTO webhooks (event, payload, url)
VALUES ('lead.deleted', trigger_data, api_webhook_record.webhook_url);
END LOOP;

RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger_workflows_on_lead_insert function
CREATE OR REPLACE FUNCTION trigger_workflows_on_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
trigger_data jsonb;
BEGIN
trigger_data := jsonb_build_object(
'trigger_event', 'LEAD_CREATED',
'id', NEW.id,
'lead_id', NEW.lead_id,
'name', NEW.name,
'email', NEW.email,
'phone', NEW.phone,
'source', NEW.source,
'interest', NEW.interest,
'stage', NEW.stage,
'assigned_to', NEW.assigned_to,
'address', NEW.address,
'company', NEW.company,
'notes', NEW.notes,
'last_contact', NEW.last_contact,
'lead_score', NEW.lead_score,
'created_at', NEW.created_at,
'updated_at', NEW.updated_at,
'affiliate_id', NEW.affiliate_id,
'pipeline_id', NEW.pipeline_id
);

INSERT INTO workflow_executions (trigger_type, trigger_data)
VALUES ('LEAD_CREATED', trigger_data);

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger_workflows_on_lead_update function
CREATE OR REPLACE FUNCTION trigger_workflows_on_lead_update()
RETURNS TRIGGER AS $$
DECLARE
trigger_data jsonb;
BEGIN
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
'assigned_to', NEW.assigned_to,
'address', NEW.address,
'company', NEW.company,
'notes', NEW.notes,
'last_contact', NEW.last_contact,
'lead_score', NEW.lead_score,
'created_at', NEW.created_at,
'updated_at', NEW.updated_at,
'affiliate_id', NEW.affiliate_id,
'pipeline_id', NEW.pipeline_id,
'previous', jsonb_build_object(
'stage', OLD.stage,
'interest', OLD.interest,
'assigned_to', OLD.assigned_to,
'notes', OLD.notes,
'last_contact', OLD.last_contact,
'lead_score', OLD.lead_score,
'pipeline_id', OLD.pipeline_id
)
);

INSERT INTO workflow_executions (trigger_type, trigger_data)
VALUES ('LEAD_UPDATED', trigger_data);

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger_workflows_on_lead_delete function
CREATE OR REPLACE FUNCTION trigger_workflows_on_lead_delete()
RETURNS TRIGGER AS $$
DECLARE
trigger_data jsonb;
BEGIN
trigger_data := jsonb_build_object(
'trigger_event', 'LEAD_DELETED',
'id', OLD.id,
'lead_id', OLD.lead_id,
'name', OLD.name,
'email', OLD.email,
'phone', OLD.phone,
'source', OLD.source,
'interest', OLD.interest,
'stage', OLD.stage,
'assigned_to', OLD.assigned_to,
'address', OLD.address,
'company', OLD.company,
'notes', OLD.notes,
'last_contact', OLD.last_contact,
'lead_score', OLD.lead_score,
'created_at', OLD.created_at,
'updated_at', OLD.updated_at,
'affiliate_id', OLD.affiliate_id,
'pipeline_id', OLD.pipeline_id
);

INSERT INTO workflow_executions (trigger_type, trigger_data)
VALUES ('LEAD_DELETED', trigger_data);

RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

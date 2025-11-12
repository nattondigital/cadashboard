/*
  # Add selfie and location URL placeholders to attendance triggers

  1. Changes
    - Add check_in_selfie and check_out_selfie placeholders to attendance triggers
    - Add check_in_location_url and check_out_location_url with Google Maps URLs
    - Extract latitude and longitude from jsonb location fields
    - Format as https://www.google.com/maps/@<latitude>,<longitude>
    
  2. New Placeholders
    - {{check_in_selfie}}: URL to check-in selfie image
    - {{check_out_selfie}}: URL to check-out selfie image
    - {{check_in_location_url}}: Google Maps URL for check-in location
    - {{check_out_location_url}}: Google Maps URL for check-out location
*/

-- Update trigger_workflows_on_attendance_checkin function
CREATE OR REPLACE FUNCTION trigger_workflows_on_attendance_checkin()
RETURNS TRIGGER AS $$
DECLARE
automation_record RECORD;
api_webhook_record RECORD;
execution_id uuid;
trigger_node jsonb;
trigger_data jsonb;
request_id bigint;
webhook_success boolean;
v_employee_name text;
v_employee_phone text;
v_check_in_lat text;
v_check_in_lng text;
v_check_in_location_url text;
BEGIN
-- Fetch employee name and phone from admin_users
SELECT full_name, phone INTO v_employee_name, v_employee_phone
FROM admin_users
WHERE id = NEW.admin_user_id;

-- Extract latitude and longitude from check_in_location
IF NEW.check_in_location IS NOT NULL THEN
v_check_in_lat := NEW.check_in_location->>'latitude';
v_check_in_lng := NEW.check_in_location->>'longitude';

-- Build Google Maps URL if we have coordinates
IF v_check_in_lat IS NOT NULL AND v_check_in_lng IS NOT NULL THEN
v_check_in_location_url := 'https://www.google.com/maps/@' || v_check_in_lat || ',' || v_check_in_lng || ',15z';
END IF;
END IF;

-- Build trigger data with trigger_event for check-in
trigger_data := jsonb_build_object(
'trigger_event', 'ATTENDANCE_CHECKIN',
'id', NEW.id,
'admin_user_id', NEW.admin_user_id,
'employee_name', COALESCE(v_employee_name, 'Unknown'),
'employee_phone', v_employee_phone,
'date', to_char(NEW.date, 'DD-MM-YYYY'),
'check_in_time', to_char(NEW.check_in_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
'check_in_selfie', COALESCE(NEW.check_in_selfie_url, ''),
'check_in_selfie_url', COALESCE(NEW.check_in_selfie_url, ''),
'check_in_location', NEW.check_in_location,
'check_in_location_url', COALESCE(v_check_in_location_url, ''),
'status', NEW.status,
'notes', NEW.notes,
'created_at', NEW.created_at,
'updated_at', NEW.updated_at,
'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
);

-- Process API Webhooks first
FOR api_webhook_record IN
SELECT *
FROM api_webhooks
WHERE trigger_event = 'ATTENDANCE_CHECKIN'
AND is_active = true
LOOP
BEGIN
webhook_success := false;

-- Make HTTP POST request using pg_net
SELECT net.http_post(
url := api_webhook_record.webhook_url,
headers := jsonb_build_object(
'Content-Type', 'application/json'
),
body := trigger_data
) INTO request_id;

webhook_success := true;

-- Update success statistics
UPDATE api_webhooks
SET 
total_calls = COALESCE(total_calls, 0) + 1,
success_count = COALESCE(success_count, 0) + 1,
last_triggered = now()
WHERE id = api_webhook_record.id;

EXCEPTION
WHEN OTHERS THEN
-- Update failure statistics
UPDATE api_webhooks
SET 
total_calls = COALESCE(total_calls, 0) + 1,
failure_count = COALESCE(failure_count, 0) + 1,
last_triggered = now()
WHERE id = api_webhook_record.id;

RAISE NOTICE 'API Webhook failed for %: %', api_webhook_record.name, SQLERRM;
END;
END LOOP;

-- Send WhatsApp to employee's phone
IF v_employee_phone IS NOT NULL AND v_employee_phone != '' THEN
PERFORM send_followup_whatsapp('ATTENDANCE_CHECKIN', v_employee_phone, v_employee_name, trigger_data);
END IF;

-- Process Workflow Automations
FOR automation_record IN
SELECT 
a.id,
a.workflow_nodes
FROM automations a
WHERE a.status = 'Active'
AND a.workflow_nodes IS NOT NULL
AND jsonb_array_length(a.workflow_nodes) > 0
LOOP
-- Get the first node (trigger node)
trigger_node := automation_record.workflow_nodes->0;

-- Check if this is an ATTENDANCE_CHECKIN trigger
IF trigger_node->>'type' = 'trigger' 
AND trigger_node->'properties'->>'event_name' = 'ATTENDANCE_CHECKIN' THEN

-- Create a workflow execution record
INSERT INTO workflow_executions (
automation_id,
trigger_type,
trigger_data,
status,
total_steps,
started_at
) VALUES (
automation_record.id,
'ATTENDANCE_CHECKIN',
trigger_data,
'pending',
jsonb_array_length(automation_record.workflow_nodes) - 1,
now()
) RETURNING id INTO execution_id;

-- Signal that a workflow needs to be executed
PERFORM pg_notify(
'workflow_execution',
json_build_object(
'execution_id', execution_id,
'automation_id', automation_record.id,
'trigger_type', 'ATTENDANCE_CHECKIN'
)::text
);
END IF;
END LOOP;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger_workflows_on_attendance_checkout function
CREATE OR REPLACE FUNCTION trigger_workflows_on_attendance_checkout()
RETURNS TRIGGER AS $$
DECLARE
automation_record RECORD;
api_webhook_record RECORD;
execution_id uuid;
trigger_node jsonb;
trigger_data jsonb;
request_id bigint;
webhook_success boolean;
v_employee_name text;
v_employee_phone text;
v_check_in_lat text;
v_check_in_lng text;
v_check_in_location_url text;
v_check_out_lat text;
v_check_out_lng text;
v_check_out_location_url text;
BEGIN
-- Only trigger if check_out_time was just set (was NULL and now has a value)
IF OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
-- Fetch employee name and phone from admin_users
SELECT full_name, phone INTO v_employee_name, v_employee_phone
FROM admin_users
WHERE id = NEW.admin_user_id;

-- Extract latitude and longitude from check_in_location
IF NEW.check_in_location IS NOT NULL THEN
v_check_in_lat := NEW.check_in_location->>'latitude';
v_check_in_lng := NEW.check_in_location->>'longitude';

-- Build Google Maps URL if we have coordinates
IF v_check_in_lat IS NOT NULL AND v_check_in_lng IS NOT NULL THEN
v_check_in_location_url := 'https://www.google.com/maps/@' || v_check_in_lat || ',' || v_check_in_lng || ',15z';
END IF;
END IF;

-- Extract latitude and longitude from check_out_location
IF NEW.check_out_location IS NOT NULL THEN
v_check_out_lat := NEW.check_out_location->>'latitude';
v_check_out_lng := NEW.check_out_location->>'longitude';

-- Build Google Maps URL if we have coordinates
IF v_check_out_lat IS NOT NULL AND v_check_out_lng IS NOT NULL THEN
v_check_out_location_url := 'https://www.google.com/maps/@' || v_check_out_lat || ',' || v_check_out_lng || ',15z';
END IF;
END IF;

-- Build trigger data with trigger_event for check-out
trigger_data := jsonb_build_object(
'trigger_event', 'ATTENDANCE_CHECKOUT',
'id', NEW.id,
'admin_user_id', NEW.admin_user_id,
'employee_name', COALESCE(v_employee_name, 'Unknown'),
'employee_phone', v_employee_phone,
'date', to_char(NEW.date, 'DD-MM-YYYY'),
'check_in_time', to_char(NEW.check_in_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
'check_out_time', to_char(NEW.check_out_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
'check_in_selfie', COALESCE(NEW.check_in_selfie_url, ''),
'check_in_selfie_url', COALESCE(NEW.check_in_selfie_url, ''),
'check_out_selfie', COALESCE(NEW.check_out_selfie_url, ''),
'check_out_selfie_url', COALESCE(NEW.check_out_selfie_url, ''),
'check_in_location', NEW.check_in_location,
'check_in_location_url', COALESCE(v_check_in_location_url, ''),
'check_out_location', NEW.check_out_location,
'check_out_location_url', COALESCE(v_check_out_location_url, ''),
'actual_working_hours', NEW.actual_working_hours,
'status', NEW.status,
'notes', NEW.notes,
'created_at', NEW.created_at,
'updated_at', NEW.updated_at,
'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
);

-- Process API Webhooks first
FOR api_webhook_record IN
SELECT *
FROM api_webhooks
WHERE trigger_event = 'ATTENDANCE_CHECKOUT'
AND is_active = true
LOOP
BEGIN
webhook_success := false;

-- Make HTTP POST request using pg_net
SELECT net.http_post(
url := api_webhook_record.webhook_url,
headers := jsonb_build_object(
'Content-Type', 'application/json'
),
body := trigger_data
) INTO request_id;

webhook_success := true;

-- Update success statistics
UPDATE api_webhooks
SET 
total_calls = COALESCE(total_calls, 0) + 1,
success_count = COALESCE(success_count, 0) + 1,
last_triggered = now()
WHERE id = api_webhook_record.id;

EXCEPTION
WHEN OTHERS THEN
-- Update failure statistics
UPDATE api_webhooks
SET 
total_calls = COALESCE(total_calls, 0) + 1,
failure_count = COALESCE(failure_count, 0) + 1,
last_triggered = now()
WHERE id = api_webhook_record.id;

RAISE NOTICE 'API Webhook failed for %: %', api_webhook_record.name, SQLERRM;
END;
END LOOP;

-- Send WhatsApp to employee's phone
IF v_employee_phone IS NOT NULL AND v_employee_phone != '' THEN
PERFORM send_followup_whatsapp('ATTENDANCE_CHECKOUT', v_employee_phone, v_employee_name, trigger_data);
END IF;

-- Process Workflow Automations
FOR automation_record IN
SELECT 
a.id,
a.workflow_nodes
FROM automations a
WHERE a.status = 'Active'
AND a.workflow_nodes IS NOT NULL
AND jsonb_array_length(a.workflow_nodes) > 0
LOOP
-- Get the first node (trigger node)
trigger_node := automation_record.workflow_nodes->0;

-- Check if this is an ATTENDANCE_CHECKOUT trigger
IF trigger_node->>'type' = 'trigger' 
AND trigger_node->'properties'->>'event_name' = 'ATTENDANCE_CHECKOUT' THEN

-- Create a workflow execution record
INSERT INTO workflow_executions (
automation_id,
trigger_type,
trigger_data,
status,
total_steps,
started_at
) VALUES (
automation_record.id,
'ATTENDANCE_CHECKOUT',
trigger_data,
'pending',
jsonb_array_length(automation_record.workflow_nodes) - 1,
now()
) RETURNING id INTO execution_id;

-- Signal that a workflow needs to be executed
PERFORM pg_notify(
'workflow_execution',
json_build_object(
'execution_id', execution_id,
'automation_id', automation_record.id,
'trigger_type', 'ATTENDANCE_CHECKOUT'
)::text
);
END IF;
END LOOP;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

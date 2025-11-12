/*
  # Fix send_followup_whatsapp placeholder replacement

  1. Changes
    - Fix the placeholder replacement logic in send_followup_whatsapp
    - Properly replace {{phone}} and {{assigned_to_phone}} with actual values
    - Compare resolved receiver_phone with contact_phone correctly
    
  2. Logic
    - Check if template receiver_phone contains {{phone}} or {{assigned_to_phone}}
    - For {{phone}}: only send to lead's phone
    - For {{assigned_to_phone}}: only send to assigned user's phone
    - Simpler logic without complex regex replacement
*/

-- Drop existing function
DROP FUNCTION IF EXISTS send_followup_whatsapp(text, text, text, jsonb);

-- Recreate with proper filtering logic
CREATE FUNCTION send_followup_whatsapp(
  p_trigger_event text,
  p_contact_phone text,
  p_contact_name text,
  p_trigger_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_assignment record;
v_template_ids uuid[];
v_template_id uuid;
v_template record;
v_request_id bigint;
v_config record;
v_formatted_contact_phone text;
v_should_send boolean;
v_lead_phone text;
v_assigned_phone text;
BEGIN
-- Get Supabase configuration from system_config table
SELECT supabase_url, service_role_key
INTO v_config
FROM system_config
LIMIT 1;

-- If configuration not found, log warning and exit
IF NOT FOUND OR v_config.supabase_url IS NULL OR v_config.service_role_key IS NULL THEN
RAISE WARNING 'System configuration not found or incomplete. WhatsApp followup skipped.';
RETURN;
END IF;

-- Get the followup assignment with all template IDs
SELECT 
whatsapp_template_id,
whatsapp_template_id_2,
whatsapp_template_id_3
INTO v_assignment
FROM followup_assignments
WHERE trigger_event = p_trigger_event;

-- If no assignment found, exit
IF NOT FOUND THEN
RETURN;
END IF;

-- Build array of template IDs (filter out nulls)
v_template_ids := ARRAY[]::uuid[];
IF v_assignment.whatsapp_template_id IS NOT NULL THEN
v_template_ids := array_append(v_template_ids, v_assignment.whatsapp_template_id);
END IF;
IF v_assignment.whatsapp_template_id_2 IS NOT NULL THEN
v_template_ids := array_append(v_template_ids, v_assignment.whatsapp_template_id_2);
END IF;
IF v_assignment.whatsapp_template_id_3 IS NOT NULL THEN
v_template_ids := array_append(v_template_ids, v_assignment.whatsapp_template_id_3);
END IF;

-- If no templates assigned, exit
IF array_length(v_template_ids, 1) IS NULL OR array_length(v_template_ids, 1) = 0 THEN
RETURN;
END IF;

-- Format p_contact_phone for comparison (remove +, spaces, dashes)
v_formatted_contact_phone := regexp_replace(p_contact_phone, '[\+\s\-]', '', 'g');
IF length(v_formatted_contact_phone) = 10 THEN
v_formatted_contact_phone := '91' || v_formatted_contact_phone;
END IF;

-- Get lead phone and assigned phone from trigger_data
v_lead_phone := regexp_replace(COALESCE(p_trigger_data->>'phone', ''), '[\+\s\-]', '', 'g');
IF length(v_lead_phone) = 10 THEN
v_lead_phone := '91' || v_lead_phone;
END IF;

v_assigned_phone := regexp_replace(COALESCE(p_trigger_data->>'assigned_to_phone', ''), '[\+\s\-]', '', 'g');
IF length(v_assigned_phone) = 10 THEN
v_assigned_phone := '91' || v_assigned_phone;
END IF;

-- Loop through each template and send message
FOREACH v_template_id IN ARRAY v_template_ids
LOOP
BEGIN
-- Get template details to check receiver_phone
SELECT receiver_phone INTO v_template
FROM whatsapp_templates
WHERE id = v_template_id;

-- Skip if template not found
IF NOT FOUND THEN
RAISE WARNING 'Template not found: %', v_template_id;
CONTINUE;
END IF;

-- Determine if this template should be sent to current contact_phone
v_should_send := false;

IF v_template.receiver_phone IS NULL OR v_template.receiver_phone = '' THEN
-- No receiver_phone specified, send to everyone (backward compatibility)
v_should_send := true;
ELSIF v_template.receiver_phone LIKE '%{{phone}}%' THEN
-- Template is for lead's phone
IF v_formatted_contact_phone = v_lead_phone THEN
v_should_send := true;
RAISE NOTICE 'Template % matched {{phone}} pattern for lead phone %', v_template_id, v_formatted_contact_phone;
ELSE
RAISE NOTICE 'Skipping template % ({{phone}} pattern) for contact phone %. Lead phone is %', 
v_template_id, v_formatted_contact_phone, v_lead_phone;
END IF;
ELSIF v_template.receiver_phone LIKE '%{{assigned_to_phone}}%' THEN
-- Template is for assigned user's phone
IF v_formatted_contact_phone = v_assigned_phone THEN
v_should_send := true;
RAISE NOTICE 'Template % matched {{assigned_to_phone}} pattern for assigned phone %', v_template_id, v_formatted_contact_phone;
ELSE
RAISE NOTICE 'Skipping template % ({{assigned_to_phone}} pattern) for contact phone %. Assigned phone is %', 
v_template_id, v_formatted_contact_phone, v_assigned_phone;
END IF;
ELSE
-- Unknown pattern, send to everyone
v_should_send := true;
END IF;

-- Only send if template matches current contact
IF NOT v_should_send THEN
CONTINUE;
END IF;

-- Make HTTP request to edge function using pg_net
SELECT net.http_post(
url := v_config.supabase_url || '/functions/v1/send-whatsapp-message',
headers := jsonb_build_object(
'Content-Type', 'application/json',
'Authorization', 'Bearer ' || v_config.service_role_key
),
body := jsonb_build_object(
'trigger_event', p_trigger_event,
'contact_phone', p_contact_phone,
'contact_name', p_contact_name,
'trigger_data', p_trigger_data,
'template_id', v_template_id
)
) INTO v_request_id;

RAISE NOTICE 'WhatsApp followup request queued: request_id=%, template_id=%, phone=%', 
v_request_id, v_template_id, v_formatted_contact_phone;

EXCEPTION WHEN OTHERS THEN
-- Log error but don't fail the transaction
RAISE WARNING 'Failed to send WhatsApp message for template %: %', v_template_id, SQLERRM;
END;
END LOOP;
END;
$$;

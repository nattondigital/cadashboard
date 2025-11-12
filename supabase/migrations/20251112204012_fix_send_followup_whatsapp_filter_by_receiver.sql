/*
  # Fix send_followup_whatsapp to filter templates by receiver_phone

  1. Changes
    - Drop and recreate send_followup_whatsapp function
    - Check receiver_phone before sending each template
    - Only send template if receiver_phone matches the contact_phone being processed
    - Prevents duplicate messages when multiple templates are configured
    
  2. Logic
    - For each template, check its receiver_phone field
    - If receiver_phone contains {{phone}}, send to lead's phone only
    - If receiver_phone contains {{assigned_to_phone}}, send to assigned user only
    - If receiver_phone is empty/null, send to both (backward compatibility)
*/

-- Drop existing function
DROP FUNCTION IF EXISTS send_followup_whatsapp(text, text, text, jsonb);

-- Recreate with filtering logic
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
v_resolved_receiver text;
v_formatted_contact_phone text;
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

-- Format p_contact_phone for comparison
v_formatted_contact_phone := regexp_replace(p_contact_phone, '[\+\s\-]', '', 'g');
IF length(v_formatted_contact_phone) = 10 THEN
v_formatted_contact_phone := '91' || v_formatted_contact_phone;
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

-- Check if this template should be sent to current contact_phone
IF v_template.receiver_phone IS NOT NULL AND v_template.receiver_phone != '' THEN
-- Resolve receiver_phone with trigger_data
v_resolved_receiver := v_template.receiver_phone;

-- Replace placeholders from trigger_data (handle nested jsonb keys)
v_resolved_receiver := regexp_replace(
v_resolved_receiver,
'\{\{(\w+)\}\}',
COALESCE(p_trigger_data->>'\1', ''),
'g'
);

-- Remove +, spaces, dashes
v_resolved_receiver := regexp_replace(v_resolved_receiver, '[\+\s\-]', '', 'g');

-- Add country code 91 if needed
IF length(v_resolved_receiver) = 10 THEN
v_resolved_receiver := '91' || v_resolved_receiver;
END IF;

-- Only send if receiver phone matches contact phone
IF v_resolved_receiver != v_formatted_contact_phone THEN
RAISE NOTICE 'Skipping template % for phone %: receiver_phone resolves to %', 
v_template_id, v_formatted_contact_phone, v_resolved_receiver;
CONTINUE;
END IF;
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

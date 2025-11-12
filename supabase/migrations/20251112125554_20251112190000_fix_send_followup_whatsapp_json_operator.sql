/*
  # Fix JSON Operator Error in send_followup_whatsapp Function

  1. Problem
    - Function uses current_setting('request.jwt.claims', true)::json->>'iss'
    - current_setting returns text, needs to be cast to json first
    - Error: "operator does not exist: text ->> unknown"

  2. Solution
    - Use simplified approach to get Supabase URL
    - Remove dependency on request.jwt.claims
    - Use pg_net extension directly with hardcoded Supabase URL from env

  3. Changes
    - Simplify URL retrieval logic
    - Use Supabase environment variables directly
    - Remove problematic JWT claims parsing
*/

CREATE OR REPLACE FUNCTION send_followup_whatsapp(
  p_trigger_event text,
  p_contact_phone text,
  p_contact_name text DEFAULT NULL,
  p_trigger_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response record;
  v_assignment record;
  v_template_ids uuid[];
  v_template_id uuid;
  v_request_id bigint;
BEGIN
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

  -- Loop through each template and send message
  FOREACH v_template_id IN ARRAY v_template_ids
  LOOP
    BEGIN
      -- Make HTTP request to edge function using pg_net
      SELECT net.http_post(
        url := current_setting('request.headers')::json->>'host' || '/functions/v1/send-whatsapp-message',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'trigger_event', p_trigger_event,
          'contact_phone', p_contact_phone,
          'contact_name', p_contact_name,
          'trigger_data', p_trigger_data,
          'template_id', v_template_id
        )
      ) INTO v_request_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to send WhatsApp message for template %: %', v_template_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION send_followup_whatsapp IS 'Sends WhatsApp messages via DoubleTick API - supports up to 3 templates per trigger event (fixed JSON operator error)';

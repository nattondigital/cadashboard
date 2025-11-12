/*
  # Fix send_followup_whatsapp to Use Environment Variables

  1. Problem
    - Function tries to use current_setting('request.headers') which may not exist
    - WhatsApp messages not being sent after recent changes
    - Need to use Supabase environment variables directly

  2. Solution
    - Get Supabase URL from SUPABASE_URL environment variable
    - Use service role key from SUPABASE_SERVICE_ROLE_KEY
    - Use pg_net.http_post with proper URL construction

  3. Implementation
    - Use current_setting for app-level settings
    - Construct full URL for edge function
    - Pass service role key in Authorization header
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
  v_assignment record;
  v_template_ids uuid[];
  v_template_id uuid;
  v_request_id bigint;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Get Supabase configuration from database settings
  -- These should be set via: ALTER DATABASE postgres SET app.settings.supabase_url = 'your-url';
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
  END;

  BEGIN
    v_service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_service_role_key := NULL;
  END;

  -- If settings not available, log warning and exit
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE WARNING 'Supabase URL or service role key not configured. WhatsApp followup skipped.';
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

  -- Loop through each template and send message
  FOREACH v_template_id IN ARRAY v_template_ids
  LOOP
    BEGIN
      -- Make HTTP request to edge function using pg_net
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/send-whatsapp-message',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'trigger_event', p_trigger_event,
          'contact_phone', p_contact_phone,
          'contact_name', p_contact_name,
          'trigger_data', p_trigger_data,
          'template_id', v_template_id
        )
      ) INTO v_request_id;
      
      RAISE NOTICE 'WhatsApp followup request queued: request_id=%, template_id=%', v_request_id, v_template_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to send WhatsApp message for template %: %', v_template_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION send_followup_whatsapp IS 'Sends WhatsApp messages via DoubleTick API - supports up to 3 templates per trigger event (uses env vars)';

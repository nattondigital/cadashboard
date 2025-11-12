/*
  # Update send_followup_whatsapp to Use Config Table

  1. Changes
    - Read Supabase URL from system_config table
    - Read service role key from system_config table
    - Use pg_net.http_post to call edge function
    - Handle missing configuration gracefully

  2. Benefits
    - No need for ALTER DATABASE permissions
    - Configuration can be updated via SQL
    - Centralized configuration management
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
  v_config record;
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

  -- Loop through each template and send message
  FOREACH v_template_id IN ARRAY v_template_ids
  LOOP
    BEGIN
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
      
      RAISE NOTICE 'WhatsApp followup request queued: request_id=%, template_id=%', v_request_id, v_template_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to send WhatsApp message for template %: %', v_template_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION send_followup_whatsapp IS 'Sends WhatsApp messages via DoubleTick API - supports up to 3 templates per trigger event (uses system_config table)';

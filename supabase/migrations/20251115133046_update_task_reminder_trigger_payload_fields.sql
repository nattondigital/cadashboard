/*
  # Update Task Reminder Trigger Payload Fields

  1. Changes
    - Add assigned_by_phone and assigned_to_phone fields to trigger payload
    - Remove unnecessary reminder detail fields:
      - reminder_custom_datetime
      - reminder_offset_timing
      - reminder_offset_value
      - reminder_offset_unit
      - reminder_display

  2. Purpose
    - Provide phone numbers for assigned users in webhook payload
    - Simplify payload by removing internal reminder configuration details
    - Keep only essential information for webhook consumers
*/

-- Update the process_due_task_reminders function with new payload structure
CREATE OR REPLACE FUNCTION process_due_task_reminders()
RETURNS TABLE (
  processed_count integer,
  reminder_ids uuid[]
) AS $$
DECLARE
  reminder_record RECORD;
  task_record RECORD;
  api_webhook_record RECORD;
  trigger_data jsonb;
  request_id bigint;
  processed_ids uuid[] := ARRAY[]::uuid[];
  count_processed integer := 0;
  v_assigned_by_phone text;
  v_assigned_to_phone text;
BEGIN
  -- Loop through all unsent reminders that are due
  FOR reminder_record IN
    SELECT * FROM task_reminders
    WHERE is_sent = false
    AND calculated_reminder_time IS NOT NULL
    AND calculated_reminder_time <= NOW()
    ORDER BY calculated_reminder_time ASC
  LOOP
    -- Get the task details
    SELECT * INTO task_record
    FROM tasks
    WHERE id = reminder_record.task_id;

    -- Skip if task not found or deleted
    IF task_record.id IS NULL THEN
      CONTINUE;
    END IF;

    -- Get assigned_by phone number
    IF task_record.assigned_by IS NOT NULL THEN
      SELECT phone INTO v_assigned_by_phone
      FROM admin_users
      WHERE id = task_record.assigned_by;
    ELSE
      v_assigned_by_phone := NULL;
    END IF;

    -- Get assigned_to phone number
    IF task_record.assigned_to IS NOT NULL THEN
      SELECT phone INTO v_assigned_to_phone
      FROM admin_users
      WHERE id = task_record.assigned_to;
    ELSE
      v_assigned_to_phone := NULL;
    END IF;

    -- Build trigger data with updated fields
    trigger_data := jsonb_build_object(
      'trigger_event', 'TASK_REMINDER',
      'reminder_id', reminder_record.id,
      'task_id', task_record.id,
      'task_readable_id', task_record.task_id,
      'task_title', task_record.title,
      'task_description', task_record.description,
      'task_status', task_record.status,
      'task_priority', task_record.priority,
      'task_category', task_record.category,
      'assigned_to', task_record.assigned_to,
      'assigned_to_name', task_record.assigned_to_name,
      'assigned_to_phone', v_assigned_to_phone,
      'assigned_by', task_record.assigned_by,
      'assigned_by_name', task_record.assigned_by_name,
      'assigned_by_phone', v_assigned_by_phone,
      'contact_id', task_record.contact_id,
      'contact_name', task_record.contact_name,
      'contact_phone', task_record.contact_phone,
      'task_due_date', task_record.due_date,
      'task_start_date', task_record.start_date,
      'task_estimated_hours', task_record.estimated_hours,
      'reminder_type', reminder_record.reminder_type,
      'reminder_scheduled_time', reminder_record.calculated_reminder_time,
      'created_at', reminder_record.created_at
    );

    -- Process API Webhooks for TASK_REMINDER
    FOR api_webhook_record IN
      SELECT * FROM api_webhooks
      WHERE trigger_event = 'TASK_REMINDER' AND is_active = true
    LOOP
      BEGIN
        SELECT net.http_post(
          url := api_webhook_record.webhook_url,
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := trigger_data
        ) INTO request_id;
        
        UPDATE api_webhooks
        SET total_calls = COALESCE(total_calls, 0) + 1,
            success_count = COALESCE(success_count, 0) + 1,
            last_triggered = now()
        WHERE id = api_webhook_record.id;
      EXCEPTION WHEN OTHERS THEN
        UPDATE api_webhooks
        SET total_calls = COALESCE(total_calls, 0) + 1,
            failure_count = COALESCE(failure_count, 0) + 1,
            last_triggered = now()
        WHERE id = api_webhook_record.id;
      END;
    END LOOP;

    -- Send WhatsApp followup if configured
    IF task_record.contact_phone IS NOT NULL THEN
      PERFORM send_followup_whatsapp(
        'TASK_REMINDER', 
        task_record.contact_phone, 
        COALESCE(task_record.contact_name, 'Contact'),
        trigger_data
      );
    END IF;

    -- Mark reminder as sent
    UPDATE task_reminders
    SET is_sent = true,
        sent_at = NOW()
    WHERE id = reminder_record.id;

    -- Add to processed list
    processed_ids := array_append(processed_ids, reminder_record.id);
    count_processed := count_processed + 1;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT count_processed, processed_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION process_due_task_reminders() TO anon;
GRANT EXECUTE ON FUNCTION process_due_task_reminders() TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_due_task_reminders() IS 
'Processes all due task reminders and calls configured webhooks. Includes assigned_by_phone and assigned_to_phone in payload. Should be called periodically via pg_cron every minute.';

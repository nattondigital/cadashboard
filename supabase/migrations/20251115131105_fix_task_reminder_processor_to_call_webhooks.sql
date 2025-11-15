/*
  # Fix Task Reminder Processor to Call Webhooks

  1. Changes
    - Fix process_due_task_reminders() function to properly call webhooks
    - SELECT webhooks from api_webhooks WHERE trigger_event = 'TASK_REMINDER'
    - Call each active webhook with reminder data
    - Also send WhatsApp followup if configured

  2. Purpose
    - Align with how other triggers work (expense, lead, task, etc.)
    - Call configured webhooks instead of inserting into api_webhooks
    - Enable proper webhook notifications for task reminders
*/

-- Drop and recreate the function with proper webhook calling
CREATE OR REPLACE FUNCTION process_due_task_reminders()
RETURNS TABLE (
  processed_count integer,
  reminder_ids uuid[]
) AS $$
DECLARE
  reminder_record RECORD;
  task_record RECORD;
  api_webhook_record RECORD;
  reminder_display_text text;
  trigger_data jsonb;
  request_id bigint;
  processed_ids uuid[] := ARRAY[]::uuid[];
  count_processed integer := 0;
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

    -- Build reminder display text
    IF reminder_record.reminder_type = 'start_date' THEN
      reminder_display_text := reminder_record.offset_value::text || ' ' || 
                               reminder_record.offset_unit || ' ' || 
                               reminder_record.offset_timing || ' Start Date';
    ELSIF reminder_record.reminder_type = 'due_date' THEN
      reminder_display_text := reminder_record.offset_value::text || ' ' || 
                               reminder_record.offset_unit || ' ' || 
                               reminder_record.offset_timing || ' Due Date';
    ELSE
      reminder_display_text := 'Custom: ' || to_char(reminder_record.custom_datetime, 'YYYY-MM-DD HH24:MI');
    END IF;

    -- Build trigger data
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
      'assigned_by', task_record.assigned_by,
      'assigned_by_name', task_record.assigned_by_name,
      'contact_id', task_record.contact_id,
      'contact_name', task_record.contact_name,
      'contact_phone', task_record.contact_phone,
      'task_due_date', task_record.due_date,
      'task_start_date', task_record.start_date,
      'task_estimated_hours', task_record.estimated_hours,
      'reminder_type', reminder_record.reminder_type,
      'reminder_custom_datetime', reminder_record.custom_datetime,
      'reminder_offset_timing', reminder_record.offset_timing,
      'reminder_offset_value', reminder_record.offset_value,
      'reminder_offset_unit', reminder_record.offset_unit,
      'reminder_scheduled_time', reminder_record.calculated_reminder_time,
      'reminder_display', reminder_display_text,
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
      PERFORM send_followup_whatsapp('TASK_REMINDER', task_record.contact_phone, trigger_data);
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
'Processes all due task reminders and calls configured webhooks. Should be called periodically via pg_cron every minute.';

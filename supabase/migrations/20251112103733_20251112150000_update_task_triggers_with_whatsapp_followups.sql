/*
  # Update Task Triggers with WhatsApp Followups

  1. Changes
    - Add WhatsApp followup functionality to task triggers
    - Add employee_name lookup from admin_users table
    - Add Indian date/time format (DD-MM-YYYY, HH24:MI in Asia/Kolkata)
    - Add submission_date, current_date, current_time variables
    - Maintain all existing phone number and webhook functionality

  2. Updated Functions
    - notify_task_created() - adds WhatsApp followups and date/time vars
    - notify_task_updated() - adds WhatsApp followups and date/time vars
    - notify_task_deleted() - adds WhatsApp followups and date/time vars

  3. WhatsApp Variables Available
    - {{task_id}} - Task ID (TSK001, etc.)
    - {{title}} - Task title
    - {{description}} - Task description
    - {{status}} - Task status
    - {{priority}} - Task priority
    - {{assigned_to_name}} - Assignee name
    - {{assigned_by_name}} - Creator name
    - {{contact_name}} - Related contact name
    - {{due_date}} - Due date
    - {{category}} - Task category
    - {{current_date}} - Current date in DD-MM-YYYY format
    - {{current_time}} - Current time in HH24:MI format (IST)
    - {{submission_date}} - Creation date in DD-MM-YYYY HH24:MI format (IST)
*/

-- Function to handle task created event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_task_created()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload jsonb;
  v_assigned_by_phone text;
  v_assigned_to_phone text;
  v_assigned_by_name text;
  v_assigned_to_name text;
BEGIN
  -- Fetch phone numbers and full names from admin_users table
  IF NEW.assigned_by IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_by_phone, v_assigned_by_name
    FROM admin_users WHERE id = NEW.assigned_by;
  END IF;

  IF NEW.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_to_phone, v_assigned_to_name
    FROM admin_users WHERE id = NEW.assigned_to;
  END IF;

  -- Build the payload with task data including phone numbers and date/time vars
  payload := jsonb_build_object(
    'trigger_event', 'TASK_CREATED',
    'task_id', NEW.task_id,
    'id', NEW.id,
    'title', NEW.title,
    'description', NEW.description,
    'status', NEW.status,
    'priority', NEW.priority,
    'assigned_to', NEW.assigned_to,
    'assigned_to_name', COALESCE(v_assigned_to_name, NEW.assigned_to_name, 'Unassigned'),
    'assigned_to_phone', v_assigned_to_phone,
    'assigned_by', NEW.assigned_by,
    'assigned_by_name', COALESCE(v_assigned_by_name, NEW.assigned_by_name, 'Unknown'),
    'assigned_by_phone', v_assigned_by_phone,
    'contact_id', NEW.contact_id,
    'contact_name', NEW.contact_name,
    'contact_phone', NEW.contact_phone,
    'due_date', NEW.due_date,
    'start_date', NEW.start_date,
    'completion_date', NEW.completion_date,
    'estimated_hours', NEW.estimated_hours,
    'actual_hours', NEW.actual_hours,
    'category', NEW.category,
    'attachments', NEW.attachments,
    'progress_percentage', NEW.progress_percentage,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  -- Process API Webhooks
  FOR webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'TASK_CREATED' AND is_active = true
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

  -- Send WhatsApp to assigned_to user
  IF v_assigned_to_phone IS NOT NULL AND v_assigned_to_phone != '' THEN
    PERFORM send_followup_whatsapp('TASK_CREATED', v_assigned_to_phone, v_assigned_to_name, payload);
  END IF;

  -- Send WhatsApp to assigned_by user (creator)
  IF v_assigned_by_phone IS NOT NULL AND v_assigned_by_phone != '' AND v_assigned_by_phone != v_assigned_to_phone THEN
    PERFORM send_followup_whatsapp('TASK_CREATED', v_assigned_by_phone, v_assigned_by_name, payload);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle task updated event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_task_updated()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload jsonb;
  v_assigned_by_phone text;
  v_assigned_to_phone text;
  v_assigned_by_name text;
  v_assigned_to_name text;
BEGIN
  -- Fetch phone numbers and full names from admin_users table
  IF NEW.assigned_by IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_by_phone, v_assigned_by_name
    FROM admin_users WHERE id = NEW.assigned_by;
  END IF;

  IF NEW.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_to_phone, v_assigned_to_name
    FROM admin_users WHERE id = NEW.assigned_to;
  END IF;

  -- Build the payload with task data including phone numbers, date/time vars, and previous values
  payload := jsonb_build_object(
    'trigger_event', 'TASK_UPDATED',
    'task_id', NEW.task_id,
    'id', NEW.id,
    'title', NEW.title,
    'description', NEW.description,
    'status', NEW.status,
    'priority', NEW.priority,
    'assigned_to', NEW.assigned_to,
    'assigned_to_name', COALESCE(v_assigned_to_name, NEW.assigned_to_name, 'Unassigned'),
    'assigned_to_phone', v_assigned_to_phone,
    'assigned_by', NEW.assigned_by,
    'assigned_by_name', COALESCE(v_assigned_by_name, NEW.assigned_by_name, 'Unknown'),
    'assigned_by_phone', v_assigned_by_phone,
    'contact_id', NEW.contact_id,
    'contact_name', NEW.contact_name,
    'contact_phone', NEW.contact_phone,
    'due_date', NEW.due_date,
    'start_date', NEW.start_date,
    'completion_date', NEW.completion_date,
    'estimated_hours', NEW.estimated_hours,
    'actual_hours', NEW.actual_hours,
    'category', NEW.category,
    'attachments', NEW.attachments,
    'progress_percentage', NEW.progress_percentage,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
    'previous', jsonb_build_object(
      'status', OLD.status,
      'priority', OLD.priority,
      'assigned_to', OLD.assigned_to,
      'due_date', OLD.due_date,
      'progress_percentage', OLD.progress_percentage
    )
  );

  -- Process API Webhooks
  FOR webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'TASK_UPDATED' AND is_active = true
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

  -- Send WhatsApp to assigned_to user
  IF v_assigned_to_phone IS NOT NULL AND v_assigned_to_phone != '' THEN
    PERFORM send_followup_whatsapp('TASK_UPDATED', v_assigned_to_phone, v_assigned_to_name, payload);
  END IF;

  -- Send WhatsApp to assigned_by user (creator)
  IF v_assigned_by_phone IS NOT NULL AND v_assigned_by_phone != '' AND v_assigned_by_phone != v_assigned_to_phone THEN
    PERFORM send_followup_whatsapp('TASK_UPDATED', v_assigned_by_phone, v_assigned_by_name, payload);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle task deleted event with WhatsApp followups
CREATE OR REPLACE FUNCTION notify_task_deleted()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload jsonb;
  v_assigned_by_phone text;
  v_assigned_to_phone text;
  v_assigned_by_name text;
  v_assigned_to_name text;
BEGIN
  -- Fetch phone numbers and full names from admin_users table
  IF OLD.assigned_by IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_by_phone, v_assigned_by_name
    FROM admin_users WHERE id = OLD.assigned_by;
  END IF;

  IF OLD.assigned_to IS NOT NULL THEN
    SELECT phone, full_name INTO v_assigned_to_phone, v_assigned_to_name
    FROM admin_users WHERE id = OLD.assigned_to;
  END IF;

  -- Build the payload with deleted task data including phone numbers and date/time vars
  payload := jsonb_build_object(
    'trigger_event', 'TASK_DELETED',
    'task_id', OLD.task_id,
    'id', OLD.id,
    'title', OLD.title,
    'description', OLD.description,
    'status', OLD.status,
    'priority', OLD.priority,
    'assigned_to', OLD.assigned_to,
    'assigned_to_name', COALESCE(v_assigned_to_name, OLD.assigned_to_name, 'Unassigned'),
    'assigned_to_phone', v_assigned_to_phone,
    'assigned_by', OLD.assigned_by,
    'assigned_by_name', COALESCE(v_assigned_by_name, OLD.assigned_by_name, 'Unknown'),
    'assigned_by_phone', v_assigned_by_phone,
    'contact_id', OLD.contact_id,
    'contact_name', OLD.contact_name,
    'contact_phone', OLD.contact_phone,
    'due_date', OLD.due_date,
    'start_date', OLD.start_date,
    'completion_date', OLD.completion_date,
    'estimated_hours', OLD.estimated_hours,
    'actual_hours', OLD.actual_hours,
    'category', OLD.category,
    'progress_percentage', OLD.progress_percentage,
    'created_at', OLD.created_at,
    'updated_at', OLD.updated_at,
    'deleted_at', NOW(),
    'submission_date', to_char(OLD.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  -- Process API Webhooks
  FOR webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'TASK_DELETED' AND is_active = true
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

  -- Send WhatsApp to assigned_to user
  IF v_assigned_to_phone IS NOT NULL AND v_assigned_to_phone != '' THEN
    PERFORM send_followup_whatsapp('TASK_DELETED', v_assigned_to_phone, v_assigned_to_name, payload);
  END IF;

  -- Send WhatsApp to assigned_by user (creator)
  IF v_assigned_by_phone IS NOT NULL AND v_assigned_by_phone != '' AND v_assigned_by_phone != v_assigned_to_phone THEN
    PERFORM send_followup_whatsapp('TASK_DELETED', v_assigned_by_phone, v_assigned_by_name, payload);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_task_created() IS 'Task creation trigger with WhatsApp followups, Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION notify_task_updated() IS 'Task update trigger with WhatsApp followups, Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION notify_task_deleted() IS 'Task deletion trigger with WhatsApp followups, Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';

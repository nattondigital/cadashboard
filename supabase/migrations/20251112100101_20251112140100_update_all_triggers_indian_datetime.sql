/*
  # Update All Remaining Triggers to Indian Date/Time Format

  1. Changes
    - Update leave request triggers (add, update, delete)
    - Update attendance triggers (add, update, delete)
    - Change date format from YYYY-MM-DD to DD-MM-YYYY
    - Change time format from HH24:MI:SS to HH24:MI
    - Use Asia/Kolkata timezone

  2. Format Examples
    - current_date: '12-11-2025'
    - current_time: '15:30'
    - submission_date: '12-11-2025 15:30'
*/

-- Leave Request Triggers
CREATE OR REPLACE FUNCTION trigger_workflows_on_leave_add()
RETURNS TRIGGER AS $$
DECLARE
  api_webhook_record RECORD;
  request_id bigint;
  trigger_data jsonb;
  v_user_phone text;
  v_user_name text;
  v_employee_name text;
BEGIN
  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT full_name INTO v_employee_name
    FROM admin_users WHERE id = NEW.admin_user_id;
  END IF;

  trigger_data := jsonb_build_object(
    'trigger_event', 'LEAVE_REQUEST_ADDED',
    'id', NEW.id,
    'leave_request_id', NEW.leave_request_id,
    'admin_user_id', NEW.admin_user_id,
    'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
    'start_date', NEW.start_date,
    'end_date', NEW.end_date,
    'leave_type', NEW.leave_type,
    'leave_category', NEW.leave_category,
    'reason', NEW.reason,
    'status', NEW.status,
    'approved_by', NEW.approved_by,
    'approved_at', NEW.approved_at,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  FOR api_webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'LEAVE_REQUEST_ADDED' AND is_active = true
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

  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT phone, full_name INTO v_user_phone, v_user_name
    FROM admin_users WHERE id = NEW.admin_user_id;

    IF v_user_phone IS NOT NULL AND v_user_phone != '' THEN
      PERFORM send_followup_whatsapp('LEAVE_REQUEST_ADDED', v_user_phone, v_user_name, trigger_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_workflows_on_leave_update()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  request_id bigint;
  v_user_phone text;
  v_user_name text;
  v_employee_name text;
BEGIN
  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT full_name INTO v_employee_name
    FROM admin_users WHERE id = NEW.admin_user_id;
  END IF;

  trigger_data := jsonb_build_object(
    'trigger_event', 'LEAVE_REQUEST_UPDATED',
    'id', NEW.id,
    'leave_request_id', NEW.leave_request_id,
    'admin_user_id', NEW.admin_user_id,
    'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
    'start_date', NEW.start_date,
    'end_date', NEW.end_date,
    'leave_type', NEW.leave_type,
    'leave_category', NEW.leave_category,
    'reason', NEW.reason,
    'status', NEW.status,
    'approved_by', NEW.approved_by,
    'approved_at', NEW.approved_at,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
    'previous', jsonb_build_object(
      'status', OLD.status,
      'start_date', OLD.start_date,
      'end_date', OLD.end_date
    )
  );

  FOR api_webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'LEAVE_REQUEST_UPDATED' AND is_active = true
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

  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT phone, full_name INTO v_user_phone, v_user_name
    FROM admin_users WHERE id = NEW.admin_user_id;

    IF v_user_phone IS NOT NULL AND v_user_phone != '' THEN
      PERFORM send_followup_whatsapp('LEAVE_REQUEST_UPDATED', v_user_phone, v_user_name, trigger_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_workflows_on_leave_delete()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  request_id bigint;
  v_user_phone text;
  v_user_name text;
  v_employee_name text;
BEGIN
  IF OLD.admin_user_id IS NOT NULL THEN
    SELECT full_name INTO v_employee_name
    FROM admin_users WHERE id = OLD.admin_user_id;
  END IF;

  trigger_data := jsonb_build_object(
    'trigger_event', 'LEAVE_REQUEST_DELETED',
    'id', OLD.id,
    'leave_request_id', OLD.leave_request_id,
    'admin_user_id', OLD.admin_user_id,
    'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
    'start_date', OLD.start_date,
    'end_date', OLD.end_date,
    'leave_type', OLD.leave_type,
    'leave_category', OLD.leave_category,
    'reason', OLD.reason,
    'status', OLD.status,
    'created_at', OLD.created_at,
    'updated_at', OLD.updated_at,
    'deleted_at', now(),
    'submission_date', to_char(OLD.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  FOR api_webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'LEAVE_REQUEST_DELETED' AND is_active = true
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

  IF OLD.admin_user_id IS NOT NULL THEN
    SELECT phone, full_name INTO v_user_phone, v_user_name
    FROM admin_users WHERE id = OLD.admin_user_id;

    IF v_user_phone IS NOT NULL AND v_user_phone != '' THEN
      PERFORM send_followup_whatsapp('LEAVE_REQUEST_DELETED', v_user_phone, v_user_name, trigger_data);
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attendance Triggers
CREATE OR REPLACE FUNCTION trigger_workflows_on_attendance_add()
RETURNS TRIGGER AS $$
DECLARE
  api_webhook_record RECORD;
  request_id bigint;
  trigger_data jsonb;
  v_user_phone text;
  v_user_name text;
  v_employee_name text;
BEGIN
  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT full_name INTO v_employee_name
    FROM admin_users WHERE id = NEW.admin_user_id;
  END IF;

  trigger_data := jsonb_build_object(
    'trigger_event', 'ATTENDANCE_ADDED',
    'id', NEW.id,
    'attendance_id', NEW.attendance_id,
    'admin_user_id', NEW.admin_user_id,
    'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
    'date', NEW.date,
    'check_in_time', NEW.check_in_time,
    'check_out_time', NEW.check_out_time,
    'status', NEW.status,
    'notes', NEW.notes,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  FOR api_webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'ATTENDANCE_ADDED' AND is_active = true
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

  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT phone, full_name INTO v_user_phone, v_user_name
    FROM admin_users WHERE id = NEW.admin_user_id;

    IF v_user_phone IS NOT NULL AND v_user_phone != '' THEN
      PERFORM send_followup_whatsapp('ATTENDANCE_ADDED', v_user_phone, v_user_name, trigger_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_workflows_on_attendance_update()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  request_id bigint;
  v_user_phone text;
  v_user_name text;
  v_employee_name text;
BEGIN
  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT full_name INTO v_employee_name
    FROM admin_users WHERE id = NEW.admin_user_id;
  END IF;

  trigger_data := jsonb_build_object(
    'trigger_event', 'ATTENDANCE_UPDATED',
    'id', NEW.id,
    'attendance_id', NEW.attendance_id,
    'admin_user_id', NEW.admin_user_id,
    'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
    'date', NEW.date,
    'check_in_time', NEW.check_in_time,
    'check_out_time', NEW.check_out_time,
    'status', NEW.status,
    'notes', NEW.notes,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at,
    'submission_date', to_char(NEW.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
    'previous', jsonb_build_object(
      'status', OLD.status,
      'check_in_time', OLD.check_in_time,
      'check_out_time', OLD.check_out_time
    )
  );

  FOR api_webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'ATTENDANCE_UPDATED' AND is_active = true
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

  IF NEW.admin_user_id IS NOT NULL THEN
    SELECT phone, full_name INTO v_user_phone, v_user_name
    FROM admin_users WHERE id = NEW.admin_user_id;

    IF v_user_phone IS NOT NULL AND v_user_phone != '' THEN
      PERFORM send_followup_whatsapp('ATTENDANCE_UPDATED', v_user_phone, v_user_name, trigger_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_workflows_on_attendance_delete()
RETURNS TRIGGER AS $$
DECLARE
  trigger_data jsonb;
  api_webhook_record RECORD;
  request_id bigint;
  v_user_phone text;
  v_user_name text;
  v_employee_name text;
BEGIN
  IF OLD.admin_user_id IS NOT NULL THEN
    SELECT full_name INTO v_employee_name
    FROM admin_users WHERE id = OLD.admin_user_id;
  END IF;

  trigger_data := jsonb_build_object(
    'trigger_event', 'ATTENDANCE_DELETED',
    'id', OLD.id,
    'attendance_id', OLD.attendance_id,
    'admin_user_id', OLD.admin_user_id,
    'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
    'date', OLD.date,
    'check_in_time', OLD.check_in_time,
    'check_out_time', OLD.check_out_time,
    'status', OLD.status,
    'notes', OLD.notes,
    'created_at', OLD.created_at,
    'updated_at', OLD.updated_at,
    'deleted_at', now(),
    'submission_date', to_char(OLD.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY HH24:MI'),
    'current_date', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'),
    'current_time', to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI')
  );

  FOR api_webhook_record IN
    SELECT * FROM api_webhooks
    WHERE trigger_event = 'ATTENDANCE_DELETED' AND is_active = true
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

  IF OLD.admin_user_id IS NOT NULL THEN
    SELECT phone, full_name INTO v_user_phone, v_user_name
    FROM admin_users WHERE id = OLD.admin_user_id;

    IF v_user_phone IS NOT NULL AND v_user_phone != '' THEN
      PERFORM send_followup_whatsapp('ATTENDANCE_DELETED', v_user_phone, v_user_name, trigger_data);
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_workflows_on_leave_add() IS 'Leave request add trigger with Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION trigger_workflows_on_leave_update() IS 'Leave request update trigger with Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION trigger_workflows_on_leave_delete() IS 'Leave request delete trigger with Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION trigger_workflows_on_attendance_add() IS 'Attendance add trigger with Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION trigger_workflows_on_attendance_update() IS 'Attendance update trigger with Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';
COMMENT ON FUNCTION trigger_workflows_on_attendance_delete() IS 'Attendance delete trigger with Indian date format (DD-MM-YYYY) and Asia/Kolkata timezone';

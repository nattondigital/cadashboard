/*
  # Create Recurring Task Triggers

  1. Triggers
    - recurring_task_created: Fires when a new recurring task is added
    - recurring_task_updated: Fires when a recurring task is updated
    - recurring_task_deleted: Fires when a recurring task is deleted
    
  2. Purpose
    - Enable webhook notifications for recurring task events
    - Integrate with workflow automation system
*/

-- Add workflow trigger events for recurring tasks
INSERT INTO workflow_triggers (name, event_name, display_name, description, event_schema, category, is_active)
VALUES 
(
  'recurring-task-created',
  'RECURRING_TASK_CREATED',
  'Recurring Task Created',
  'Triggered when a new recurring task is created',
  '{
    "recurrence_task_id": "string",
    "title": "string",
    "description": "string",
    "contact_id": "string",
    "assigned_to": "string",
    "priority": "string",
    "recurrence_type": "string",
    "start_time": "string",
    "start_days": "array",
    "start_day_of_month": "number",
    "due_time": "string",
    "due_days": "array",
    "due_day_of_month": "number",
    "next_recurrence": "string",
    "is_active": "boolean",
    "created_at": "string",
    "trigger_event": "string"
  }'::jsonb,
  'Recurring Tasks',
  true
),
(
  'recurring-task-updated',
  'RECURRING_TASK_UPDATED',
  'Recurring Task Updated',
  'Triggered when a recurring task is updated',
  '{
    "recurrence_task_id": "string",
    "title": "string",
    "description": "string",
    "contact_id": "string",
    "assigned_to": "string",
    "priority": "string",
    "recurrence_type": "string",
    "start_time": "string",
    "start_days": "array",
    "start_day_of_month": "number",
    "due_time": "string",
    "due_days": "array",
    "due_day_of_month": "number",
    "next_recurrence": "string",
    "is_active": "boolean",
    "updated_at": "string",
    "trigger_event": "string"
  }'::jsonb,
  'Recurring Tasks',
  true
),
(
  'recurring-task-deleted',
  'RECURRING_TASK_DELETED',
  'Recurring Task Deleted',
  'Triggered when a recurring task is deleted',
  '{
    "recurrence_task_id": "string",
    "title": "string",
    "recurrence_type": "string",
    "trigger_event": "string"
  }'::jsonb,
  'Recurring Tasks',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Function to send recurring task created webhook
CREATE OR REPLACE FUNCTION send_recurring_task_created_webhook()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := webhook.url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook.auth_token, '')
    ),
    body := jsonb_build_object(
      'recurrence_task_id', NEW.recurrence_task_id,
      'title', NEW.title,
      'description', NEW.description,
      'contact_id', NEW.contact_id,
      'assigned_to', NEW.assigned_to,
      'priority', NEW.priority,
      'recurrence_type', NEW.recurrence_type,
      'start_time', NEW.start_time,
      'start_days', NEW.start_days,
      'start_day_of_month', NEW.start_day_of_month,
      'due_time', NEW.due_time,
      'due_days', NEW.due_days,
      'due_day_of_month', NEW.due_day_of_month,
      'next_recurrence', NEW.next_recurrence,
      'is_active', NEW.is_active,
      'created_at', NEW.created_at,
      'trigger_event', 'RECURRING_TASK_CREATED'
    )
  )
  FROM api_webhooks webhook
  WHERE webhook.event = 'RECURRING_TASK_CREATED' AND webhook.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send recurring task updated webhook
CREATE OR REPLACE FUNCTION send_recurring_task_updated_webhook()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := webhook.url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook.auth_token, '')
    ),
    body := jsonb_build_object(
      'recurrence_task_id', NEW.recurrence_task_id,
      'title', NEW.title,
      'description', NEW.description,
      'contact_id', NEW.contact_id,
      'assigned_to', NEW.assigned_to,
      'priority', NEW.priority,
      'recurrence_type', NEW.recurrence_type,
      'start_time', NEW.start_time,
      'start_days', NEW.start_days,
      'start_day_of_month', NEW.start_day_of_month,
      'due_time', NEW.due_time,
      'due_days', NEW.due_days,
      'due_day_of_month', NEW.due_day_of_month,
      'next_recurrence', NEW.next_recurrence,
      'is_active', NEW.is_active,
      'updated_at', NEW.updated_at,
      'trigger_event', 'RECURRING_TASK_UPDATED'
    )
  )
  FROM api_webhooks webhook
  WHERE webhook.event = 'RECURRING_TASK_UPDATED' AND webhook.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send recurring task deleted webhook
CREATE OR REPLACE FUNCTION send_recurring_task_deleted_webhook()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := webhook.url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook.auth_token, '')
    ),
    body := jsonb_build_object(
      'recurrence_task_id', OLD.recurrence_task_id,
      'title', OLD.title,
      'recurrence_type', OLD.recurrence_type,
      'trigger_event', 'RECURRING_TASK_DELETED'
    )
  )
  FROM api_webhooks webhook
  WHERE webhook.event = 'RECURRING_TASK_DELETED' AND webhook.is_active = true;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS recurring_task_created_trigger ON recurring_tasks;
CREATE TRIGGER recurring_task_created_trigger
  AFTER INSERT ON recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION send_recurring_task_created_webhook();

DROP TRIGGER IF EXISTS recurring_task_updated_trigger ON recurring_tasks;
CREATE TRIGGER recurring_task_updated_trigger
  AFTER UPDATE ON recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION send_recurring_task_updated_webhook();

DROP TRIGGER IF EXISTS recurring_task_deleted_trigger ON recurring_tasks;
CREATE TRIGGER recurring_task_deleted_trigger
  AFTER DELETE ON recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION send_recurring_task_deleted_webhook();

-- Add comments
COMMENT ON FUNCTION send_recurring_task_created_webhook() IS 'Sends webhook notification when a recurring task is created';
COMMENT ON FUNCTION send_recurring_task_updated_webhook() IS 'Sends webhook notification when a recurring task is updated';
COMMENT ON FUNCTION send_recurring_task_deleted_webhook() IS 'Sends webhook notification when a recurring task is deleted';

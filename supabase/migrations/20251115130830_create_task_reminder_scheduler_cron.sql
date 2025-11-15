/*
  # Create Task Reminder Scheduler with pg_cron

  1. Overview
    - Creates a function to call the process-task-reminders Edge Function via HTTP
    - Sets up pg_cron to run every minute to check for due reminders
    - Similar to recurring task scheduler implementation

  2. Components
    - Function: trigger_task_reminder_processor()
    - Calls the Edge Function via pg_net
    - Scheduled to run every minute via pg_cron

  3. Purpose
    - Automatically process task reminders when they become due
    - Send webhook events to api_webhooks for reminder notifications
    - Mark reminders as sent after processing
*/

-- Ensure pg_cron and pg_net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION trigger_task_reminder_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text := 'https://lddridmkphmckbjjlfxi.supabase.co';
  supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4';
  request_id bigint;
BEGIN
  -- Call the Edge Function using pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  -- Log the request
  RAISE NOTICE 'Triggered task reminder processor with request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering task reminder processor: %', SQLERRM;
END;
$$;

-- Drop existing schedule if it exists
SELECT cron.unschedule('process-task-reminders') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-task-reminders'
);

-- Schedule the function to run every minute
SELECT cron.schedule(
  'process-task-reminders',
  '* * * * *', -- Every minute
  $$SELECT trigger_task_reminder_processor()$$
);

COMMENT ON FUNCTION trigger_task_reminder_processor() IS 'Triggers the Edge Function to process due task reminders every minute via pg_cron';

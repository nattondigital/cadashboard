/*
  # Update Existing Recurring Tasks with RETASK IDs and Next Recurrence

  1. Changes
    - Generate RETASK IDs for existing recurring tasks
    - Calculate and set next_recurrence for existing tasks
    
  2. Purpose
    - Ensure all existing recurring tasks have proper RETASK IDs
    - Set initial next_recurrence dates for proper scheduling
*/

-- Function to calculate next recurrence for existing tasks
CREATE OR REPLACE FUNCTION calculate_initial_next_recurrence(
  p_recurrence_type text,
  p_start_time time,
  p_start_days text[],
  p_start_day_of_month integer
) RETURNS timestamptz AS $$
DECLARE
  v_now timestamptz;
  v_kolkata_time timestamp;
  v_next_recurrence timestamp;
  v_start_hour integer;
  v_start_minute integer;
  v_current_day_of_week text;
  v_current_day_of_month integer;
  v_days_of_week text[] := ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  v_current_day_index integer;
  v_start_day_index integer;
  v_days_to_add integer := 7;
  v_diff integer;
  v_start_day integer;
BEGIN
  -- Get current time in Asia/Kolkata timezone
  v_now := now();
  v_kolkata_time := v_now AT TIME ZONE 'Asia/Kolkata';
  v_next_recurrence := v_kolkata_time;
  
  -- Extract hour and minute from start_time
  v_start_hour := EXTRACT(HOUR FROM p_start_time);
  v_start_minute := EXTRACT(MINUTE FROM p_start_time);
  
  IF p_recurrence_type = 'daily' THEN
    -- For daily tasks, set to today at start time or tomorrow if passed
    v_next_recurrence := date_trunc('day', v_kolkata_time) + (v_start_hour || ' hours')::interval + (v_start_minute || ' minutes')::interval;
    IF v_next_recurrence <= v_kolkata_time THEN
      v_next_recurrence := v_next_recurrence + interval '1 day';
    END IF;
    
  ELSIF p_recurrence_type = 'weekly' THEN
    -- Get current day of week
    v_current_day_of_week := lower(to_char(v_kolkata_time, 'Dy'));
    v_current_day_index := array_position(v_days_of_week, v_current_day_of_week) - 1;
    
    -- Find the next occurrence day
    FOREACH v_current_day_of_week IN ARRAY p_start_days LOOP
      v_start_day_index := array_position(v_days_of_week, v_current_day_of_week) - 1;
      v_diff := v_start_day_index - v_current_day_index;
      IF v_diff < 0 THEN
        v_diff := v_diff + 7;
      END IF;
      IF v_diff = 0 THEN
        v_next_recurrence := date_trunc('day', v_kolkata_time) + (v_start_hour || ' hours')::interval + (v_start_minute || ' minutes')::interval;
        IF v_next_recurrence <= v_kolkata_time THEN
          v_diff := 7;
        END IF;
      END IF;
      IF v_diff < v_days_to_add THEN
        v_days_to_add := v_diff;
      END IF;
    END LOOP;
    
    v_next_recurrence := date_trunc('day', v_kolkata_time) + (v_days_to_add || ' days')::interval + (v_start_hour || ' hours')::interval + (v_start_minute || ' minutes')::interval;
    
  ELSIF p_recurrence_type = 'monthly' THEN
    v_start_day := p_start_day_of_month;
    
    -- Handle "last day of month" (0 means last day)
    IF v_start_day = 0 THEN
      v_start_day := EXTRACT(DAY FROM (date_trunc('month', v_kolkata_time) + interval '1 month' - interval '1 day'));
    END IF;
    
    -- Set to start day of current month at start time
    v_next_recurrence := date_trunc('month', v_kolkata_time) + ((v_start_day - 1) || ' days')::interval + (v_start_hour || ' hours')::interval + (v_start_minute || ' minutes')::interval;
    
    -- If already passed, move to next month
    IF v_next_recurrence <= v_kolkata_time THEN
      v_next_recurrence := date_trunc('month', v_kolkata_time) + interval '1 month';
      IF v_start_day = 0 THEN
        v_start_day := EXTRACT(DAY FROM (v_next_recurrence + interval '1 month' - interval '1 day'));
      END IF;
      v_next_recurrence := v_next_recurrence + ((v_start_day - 1) || ' days')::interval + (v_start_hour || ' hours')::interval + (v_start_minute || ' minutes')::interval;
    END IF;
  END IF;
  
  RETURN v_next_recurrence AT TIME ZONE 'Asia/Kolkata' AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Update existing recurring tasks that don't have recurrence_task_id
DO $$
DECLARE
  v_task record;
  v_counter integer := 1;
  v_retask_id text;
  v_next_recurrence timestamptz;
BEGIN
  -- Loop through all tasks without recurrence_task_id
  FOR v_task IN 
    SELECT * FROM recurring_tasks 
    WHERE recurrence_task_id IS NULL 
    ORDER BY created_at
  LOOP
    -- Generate RETASK ID
    v_retask_id := 'RETASK' || LPAD(v_counter::text, 3, '0');
    
    -- Calculate next_recurrence
    v_next_recurrence := calculate_initial_next_recurrence(
      v_task.recurrence_type,
      v_task.start_time,
      v_task.start_days,
      v_task.start_day_of_month
    );
    
    -- Update the task
    UPDATE recurring_tasks
    SET 
      recurrence_task_id = v_retask_id,
      next_recurrence = v_next_recurrence,
      updated_at = now()
    WHERE id = v_task.id;
    
    RAISE NOTICE 'Updated task: % with RETASK ID: % and next_recurrence: %', v_task.title, v_retask_id, v_next_recurrence;
    
    v_counter := v_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % recurring tasks', v_counter - 1;
END $$;

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS calculate_initial_next_recurrence(text, time, text[], integer);

/*
  # Fix Half Day Attendance Condition

  1. Changes
    - Update Half Day logic: actual_working_hours >= half_day_hours (was < half_day_hours)
    - Update status calculation to properly identify Half Day vs Present status
    
  2. New Logic
    - **Overtime**: actual_working_hours >= overtime_hours
    - **Full Day**: actual_working_hours >= full_day_hours (but < overtime_hours)
    - **Half Day**: actual_working_hours >= half_day_hours (but < full_day_hours)
    - **Present**: actual_working_hours < half_day_hours (between 0 and half_day_hours)
    - **Absent**: No check-in

  3. Security
    - No changes to RLS policies
*/

-- Update function to fix Half Day condition
CREATE OR REPLACE FUNCTION calculate_attendance_status()
RETURNS TRIGGER AS $$
DECLARE
  v_day_of_week text;
  v_full_day_hours numeric;
  v_half_day_hours numeric;
  v_overtime_hours numeric;
  v_actual_hours numeric := 0;
BEGIN
  -- If no check-in, status is Absent
  IF NEW.check_in_time IS NULL THEN
    NEW.status := 'Absent';
    NEW.actual_working_hours := 0;
    RETURN NEW;
  END IF;

  -- If check-in exists but no check-out, status is Present
  IF NEW.check_out_time IS NULL THEN
    NEW.status := 'Present';
    NEW.actual_working_hours := 0;
    RETURN NEW;
  END IF;

  -- Calculate actual working hours from check-in and check-out
  v_actual_hours := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
  NEW.actual_working_hours := v_actual_hours;

  -- Get day of week from date
  v_day_of_week := LOWER(TO_CHAR(NEW.date, 'Day'));
  v_day_of_week := TRIM(v_day_of_week);

  -- Try to get user-specific working hours first
  SELECT 
    full_day_hours,
    half_day_hours,
    overtime_hours
  INTO 
    v_full_day_hours,
    v_half_day_hours,
    v_overtime_hours
  FROM user_working_hours_settings
  WHERE user_id = NEW.admin_user_id
    AND day = v_day_of_week
  LIMIT 1;

  -- If no user-specific settings, fall back to default working hours
  IF v_full_day_hours IS NULL THEN
    SELECT 
      full_day_hours,
      half_day_hours,
      overtime_hours
    INTO 
      v_full_day_hours,
      v_half_day_hours,
      v_overtime_hours
    FROM working_hours_settings
    WHERE day = v_day_of_week
    LIMIT 1;
  END IF;

  -- If still no settings found, use default values
  IF v_full_day_hours IS NULL THEN
    v_full_day_hours := 9.0;
    v_half_day_hours := 4.5;
    v_overtime_hours := 10.0;
  END IF;

  -- Apply payroll policy rules (priority order matters!)
  -- Rule 1: Overtime - if actual hours >= overtime hours
  IF v_actual_hours >= v_overtime_hours THEN
    NEW.status := 'Overtime';
  -- Rule 2: Full Day - if actual hours >= full day hours (but < overtime)
  ELSIF v_actual_hours >= v_full_day_hours THEN
    NEW.status := 'Full Day';
  -- Rule 3: Half Day - if actual hours >= half day hours (but < full day)
  ELSIF v_actual_hours >= v_half_day_hours THEN
    NEW.status := 'Half Day';
  -- Rule 4: Present - if actual hours < half day hours (worked some, but not enough for half day)
  ELSE
    NEW.status := 'Present';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to recalculate status with new logic
UPDATE attendance SET updated_at = now();

-- Update comment on status column
COMMENT ON COLUMN attendance.status IS 'Attendance status: Absent (no check-in), Present (hours < half_day_hours), Half Day (hours >= half_day_hours), Full Day (hours >= full_day_hours), Overtime (hours >= overtime_hours)';

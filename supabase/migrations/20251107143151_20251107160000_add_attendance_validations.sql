/*
  # Add Attendance Validations

  1. Validations Added
    - Check-out can only be done on the same date as check-in
    - User cannot check in if their last attendance status is "Present"
    
  2. Implementation
    - Create validation function for check-out date
    - Create validation function for preventing duplicate check-ins
    - Add check constraints and triggers
    
  3. Business Rules
    - Check-out date must match check-in date (same calendar day)
    - Users must check out before creating a new check-in entry
*/

-- Validation Function: Ensure check-out is on the same date as check-in
CREATE OR REPLACE FUNCTION validate_checkout_same_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate when check_out_time is being set
  IF NEW.check_out_time IS NOT NULL THEN
    -- Extract date from check_out_time and compare with attendance.date
    IF DATE(NEW.check_out_time) != NEW.date THEN
      RAISE EXCEPTION 'Check-out must be done on the same date as check-in. Check-in date: %, Check-out date: %', 
        NEW.date, 
        DATE(NEW.check_out_time);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_validate_checkout_same_date ON attendance;

-- Create trigger for check-out date validation
CREATE TRIGGER trigger_validate_checkout_same_date
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_checkout_same_date();

-- Validation Function: Prevent check-in if last entry is "Present"
CREATE OR REPLACE FUNCTION validate_no_duplicate_checkin()
RETURNS TRIGGER AS $$
DECLARE
  v_last_status text;
  v_last_date date;
BEGIN
  -- Only validate on INSERT (new check-in)
  IF TG_OP = 'INSERT' THEN
    -- Get the most recent attendance record for this user
    SELECT status, date INTO v_last_status, v_last_date
    FROM attendance
    WHERE admin_user_id = NEW.admin_user_id
    ORDER BY date DESC, check_in_time DESC
    LIMIT 1;
    
    -- If last status is "Present", prevent new check-in
    IF v_last_status = 'Present' THEN
      RAISE EXCEPTION 'Cannot check in. Your last attendance entry (%) is still marked as "Present". Please check out first before creating a new check-in.', 
        v_last_date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_validate_no_duplicate_checkin ON attendance;

-- Create trigger for duplicate check-in prevention
-- This runs AFTER the status calculation trigger
CREATE TRIGGER trigger_validate_no_duplicate_checkin
  BEFORE INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_no_duplicate_checkin();

-- Add comments for documentation
COMMENT ON FUNCTION validate_checkout_same_date() IS 'Ensures check-out time is on the same calendar date as check-in date';
COMMENT ON FUNCTION validate_no_duplicate_checkin() IS 'Prevents users from checking in if their last attendance status is "Present"';

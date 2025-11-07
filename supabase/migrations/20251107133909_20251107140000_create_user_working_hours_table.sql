/*
  # Create User-Specific Working Hours Table

  1. New Tables
    - `user_working_hours_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to admin_users)
      - `day` (text) - Day of week: monday, tuesday, wednesday, thursday, friday, saturday, sunday
      - `is_working_day` (boolean) - Whether this is a working day for this user
      - `start_time` (time) - User's office start time
      - `end_time` (time) - User's office end time
      - `total_working_hours` (numeric) - Auto-calculated from start and end time
      - `full_day_hours` (numeric) - Hours required for full day for this user
      - `half_day_hours` (numeric) - Hours required for half day for this user
      - `overtime_hours` (numeric) - Hours considered as overtime for this user
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_working_hours_settings` table
    - Add policies for authenticated users to manage user working hours

  3. Notes
    - If no user-specific working hours exist, the system will fall back to the default working_hours_settings
    - Each user can have customized working hours for each day of the week
*/

-- Create user_working_hours_settings table
CREATE TABLE IF NOT EXISTS user_working_hours_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  is_working_day boolean DEFAULT true,
  start_time time DEFAULT '09:00:00',
  end_time time DEFAULT '18:00:00',
  total_working_hours numeric DEFAULT 9.0,
  full_day_hours numeric DEFAULT 9.0,
  half_day_hours numeric DEFAULT 4.5,
  overtime_hours numeric DEFAULT 2.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day)
);

-- Enable RLS
ALTER TABLE user_working_hours_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view user working hours settings"
  ON user_working_hours_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert user working hours settings"
  ON user_working_hours_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update user working hours settings"
  ON user_working_hours_settings
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete user working hours settings"
  ON user_working_hours_settings
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create function to auto-calculate total working hours for user-specific settings
CREATE OR REPLACE FUNCTION calculate_user_working_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if it's a working day
  IF NEW.is_working_day THEN
    -- Calculate hours difference between start and end time
    NEW.total_working_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  ELSE
    NEW.total_working_hours := 0;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate working hours on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_user_working_hours ON user_working_hours_settings;
CREATE TRIGGER trigger_calculate_user_working_hours
  BEFORE INSERT OR UPDATE ON user_working_hours_settings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_user_working_hours();

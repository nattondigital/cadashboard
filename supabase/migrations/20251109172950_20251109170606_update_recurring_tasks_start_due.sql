/*
  # Update Recurring Tasks with Start and Due Date/Time

  1. Changes
    - Drop existing recurring_tasks table
    - Recreate with new schema for start and due date/time configurations
    - For daily: start_time and due_time
    - For weekly: start_days, start_time, due_days, due_time
    - For monthly: start_day_of_month, start_time, due_day_of_month, due_time

  2. New Structure
    - `start_time` (time) - Start time for daily tasks
    - `start_days` (text[]) - Start days for weekly tasks
    - `start_day_of_month` (integer) - Start day for monthly tasks
    - `due_time` (time) - Due time for daily tasks
    - `due_days` (text[]) - Due days for weekly tasks
    - `due_day_of_month` (integer) - Due day for monthly tasks

  3. Security
    - Same RLS policies as before
*/

-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS recurring_tasks CASCADE;

-- Create recurring_tasks table with new schema
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  contact_id uuid REFERENCES contacts_master(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),

  -- Start Date/Time fields
  start_time time NOT NULL,
  start_days text[], -- For weekly: ['mon', 'tue', etc.]
  start_day_of_month integer, -- For monthly: 1-31, or 0 for last day

  -- Due Date/Time fields
  due_time time NOT NULL,
  due_days text[], -- For weekly: ['mon', 'tue', etc.]
  due_day_of_month integer, -- For monthly: 1-31, or 0 for last day

  supporting_docs jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints for recurrence fields
ALTER TABLE recurring_tasks
  ADD CONSTRAINT check_weekly_start_days
  CHECK (
    recurrence_type != 'weekly' OR
    (start_days IS NOT NULL AND array_length(start_days, 1) > 0)
  );

ALTER TABLE recurring_tasks
  ADD CONSTRAINT check_weekly_due_days
  CHECK (
    recurrence_type != 'weekly' OR
    (due_days IS NOT NULL AND array_length(due_days, 1) > 0)
  );

ALTER TABLE recurring_tasks
  ADD CONSTRAINT check_monthly_start_day
  CHECK (
    recurrence_type != 'monthly' OR
    (start_day_of_month IS NOT NULL AND start_day_of_month >= 0 AND start_day_of_month <= 31)
  );

ALTER TABLE recurring_tasks
  ADD CONSTRAINT check_monthly_due_day
  CHECK (
    recurrence_type != 'monthly' OR
    (due_day_of_month IS NOT NULL AND due_day_of_month >= 0 AND due_day_of_month <= 31)
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_contact ON recurring_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_assigned_to ON recurring_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_is_active ON recurring_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_recurrence_type ON recurring_tasks(recurrence_type);

-- Enable RLS
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow anonymous read access to recurring_tasks"
  ON recurring_tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to recurring_tasks"
  ON recurring_tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to recurring_tasks"
  ON recurring_tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to recurring_tasks"
  ON recurring_tasks FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated read access to recurring_tasks"
  ON recurring_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert access to recurring_tasks"
  ON recurring_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to recurring_tasks"
  ON recurring_tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access to recurring_tasks"
  ON recurring_tasks FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_recurring_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_recurring_tasks_updated_at
  BEFORE UPDATE ON recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_tasks_updated_at();

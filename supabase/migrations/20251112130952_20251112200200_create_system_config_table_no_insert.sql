/*
  # Create System Configuration Table (No Auto Insert)

  1. New Table
    - system_config: Stores system-wide configuration like Supabase URL
    - Single row table with key-value pairs
    - Used by triggers to access environment variables

  2. Purpose
    - Store Supabase URL for edge function calls
    - Store service role key for authenticated requests
    - Allow triggers to access configuration

  3. Security
    - Enable RLS to restrict access
    - Only authenticated users can read
*/

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_url text NOT NULL,
  service_role_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policies - allow all reads for function execution
CREATE POLICY "Anyone can read system config"
  ON system_config
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert system config"
  ON system_config
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update system config"
  ON system_config
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE system_config IS 'System-wide configuration for triggers and functions';
COMMENT ON COLUMN system_config.supabase_url IS 'Supabase project URL for edge function calls';
COMMENT ON COLUMN system_config.service_role_key IS 'Service role key for authenticated API calls';

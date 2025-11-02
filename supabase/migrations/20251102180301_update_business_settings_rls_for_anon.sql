/*
  # Update Business Settings RLS for Anonymous Access

  1. Changes
    - Drop existing policies for business_settings
    - Add new policies allowing anonymous users to insert and update
    - This allows OTP-authenticated users to manage business settings

  2. Security
    - Read access remains public (anyone can read)
    - Write access (insert/update) now available to all users
    - Single-row constraint enforced at application level
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert business settings" ON business_settings;
DROP POLICY IF EXISTS "Authenticated users can update business settings" ON business_settings;

-- Create new policies for anonymous access
CREATE POLICY "Anyone can insert business settings"
  ON business_settings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update business settings"
  ON business_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
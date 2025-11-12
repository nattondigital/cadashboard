/*
  # Remove owner field and use assigned_to only

  1. Changes
    - Drop the `owner` text column from leads table
    - The `assigned_to` UUID field will be the single source of truth
    - All triggers and webhooks already use assigned_to with admin_users join
    
  2. Notes
    - Frontend will need to display admin_users.full_name via JOIN
    - Triggers already resolve assigned_to → full_name via admin_users table
    - This eliminates data duplication and inconsistency issues
*/

-- Drop the owner column from leads table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'owner'
  ) THEN
    ALTER TABLE leads DROP COLUMN owner;
  END IF;
END $$;

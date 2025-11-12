/*
  # Remove Notes Column from Expenses Table

  1. Changes
    - Drop the notes column from expenses table
    - Notes field has been removed from the frontend UI
    - This column is no longer needed

  2. Notes
    - Using IF EXISTS to prevent errors if column doesn't exist
    - Data in notes column will be permanently deleted
*/

-- Drop notes column from expenses table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'expenses'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE expenses DROP COLUMN notes;
  END IF;
END $$;

COMMENT ON TABLE expenses IS 'Expense tracking table without notes column';

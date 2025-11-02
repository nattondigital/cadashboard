/*
  # Update invoices table schema

  1. Changes to invoices table
    - Remove `payment_method` column (no longer needed as payment details are in receipts)
    - Remove `paid_date` column (payment dates are tracked in receipts)
    - Add `receipts` column (jsonb array to store all receipt references for this invoice)
  
  2. Notes
    - The receipts array will store receipt information for quick reference
    - Each receipt entry will contain: receipt_id, amount_paid, payment_date, payment_method
    - This denormalizes receipt data for faster invoice queries without joins
*/

-- Add receipts column to store array of receipt information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'receipts'
  ) THEN
    ALTER TABLE invoices ADD COLUMN receipts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Drop payment_method column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices DROP COLUMN payment_method;
  END IF;
END $$;

-- Drop paid_date column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'paid_date'
  ) THEN
    ALTER TABLE invoices DROP COLUMN paid_date;
  END IF;
END $$;
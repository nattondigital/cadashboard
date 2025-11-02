/*
  # Add Invoiced Status to Estimates

  1. Changes
    - Drop existing status check constraint on estimates table
    - Add new status check constraint that includes 'Invoiced' status
  
  2. Status Values
    - Draft: Initial state when estimate is created
    - Sent: Estimate has been sent to customer
    - Accepted: Customer has accepted the estimate
    - Rejected: Customer has rejected the estimate
    - Expired: Estimate has passed its valid_until date
    - Invoiced: An invoice has been created from this estimate
  
  3. Notes
    - This allows the system to track which estimates have been converted to invoices
    - Existing estimates will not be affected, only the allowed values are expanded
*/

-- Drop the existing check constraint
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;

-- Add the new check constraint with 'Invoiced' included
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check 
  CHECK (status = ANY (ARRAY['Draft'::text, 'Sent'::text, 'Accepted'::text, 'Rejected'::text, 'Expired'::text, 'Invoiced'::text]));

/*
  # Fix Lead ID Generation for 4+ Digits

  1. Problem
    - Current trigger uses LPAD with 3 digits fixed
    - After L999, next ID should be L1000, not L1000 truncated
    - This causes duplicate key constraint violations

  2. Changes
    - Update generate_lead_id() function to handle dynamic padding
    - If number > 999, use 4 digits (L1000, L1001, etc.)
    - If number > 9999, use 5 digits, and so on
    - Maintain backward compatibility with existing 3-digit IDs

  3. Logic
    - Calculate required padding based on number of digits
    - Use at least 3 digits for padding
    - Automatically expand to 4, 5, 6 digits as needed

  4. Notes
    - Fixes the "duplicate key value violates unique constraint" error
    - Allows unlimited lead ID growth
*/

-- Create improved function to auto-generate lead_id with dynamic padding
CREATE OR REPLACE FUNCTION generate_lead_id()
RETURNS TRIGGER AS $$
DECLARE
  new_lead_id TEXT;
  last_lead_id TEXT;
  last_number INTEGER;
  padding_length INTEGER;
BEGIN
  -- Only generate if lead_id is not provided or is empty
  IF NEW.lead_id IS NULL OR NEW.lead_id = '' THEN
    -- Get the last lead_id by extracting and comparing numeric values
    SELECT lead_id INTO last_lead_id
    FROM leads
    WHERE lead_id ~ '^L[0-9]+$'  -- Only match valid format
    ORDER BY CAST(SUBSTRING(lead_id FROM 2) AS INTEGER) DESC
    LIMIT 1;
    
    IF last_lead_id IS NULL THEN
      new_lead_id := 'L001';
    ELSE
      -- Extract number from last lead_id (e.g., 'L005' -> 5, 'L999' -> 999)
      last_number := CAST(SUBSTRING(last_lead_id FROM 2) AS INTEGER);
      
      -- Increment the number
      last_number := last_number + 1;
      
      -- Calculate required padding (minimum 3 digits)
      padding_length := GREATEST(3, LENGTH(last_number::TEXT));
      
      -- Format with dynamic padding
      new_lead_id := 'L' || LPAD(last_number::TEXT, padding_length, '0');
    END IF;
    
    NEW.lead_id := new_lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, just updating the function

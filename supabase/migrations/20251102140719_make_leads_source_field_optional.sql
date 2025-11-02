/*
  # Make leads source field optional
  
  1. Changes
    - Remove default value from source field in leads table
    - Allow NULL values for source field (already nullable)
    
  2. Purpose
    - Make source field truly optional without forced default value
    - Allow leads to be created without specifying source
*/

-- Remove default value from source field
ALTER TABLE leads
ALTER COLUMN source DROP DEFAULT;

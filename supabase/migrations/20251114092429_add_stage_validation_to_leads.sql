/*
  # Add Stage Validation to Leads Table

  1. Changes
    - Add a check constraint to ensure the stage value exists in the pipeline_stages table
    - Create a validation function to verify stage belongs to the selected pipeline
    - Add a trigger to enforce validation on insert and update

  2. Security
    - Ensures data integrity by preventing invalid stage values
    - Prevents leads from having stages that don't exist in their assigned pipeline

  3. Notes
    - This constraint will work alongside the frontend validation
    - Any direct database modifications will also be validated
*/

-- Create a function to validate that the stage exists in the pipeline
CREATE OR REPLACE FUNCTION validate_lead_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- If both pipeline_id and stage are provided, validate the stage exists in that pipeline
  IF NEW.pipeline_id IS NOT NULL AND NEW.stage IS NOT NULL THEN
    -- Check if the stage exists and is active in the selected pipeline
    IF NOT EXISTS (
      SELECT 1 
      FROM pipeline_stages 
      WHERE pipeline_id = NEW.pipeline_id 
        AND stage_id = NEW.stage 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Invalid stage "%" for pipeline. The stage does not exist or is inactive in the selected pipeline.', NEW.stage;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS validate_lead_stage_trigger ON leads;

-- Create the trigger to validate stage on insert and update
CREATE TRIGGER validate_lead_stage_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION validate_lead_stage();

COMMENT ON FUNCTION validate_lead_stage() IS 'Validates that a lead''s stage exists and is active in the selected pipeline';

/*
  # Add Receiver Phone Field to WhatsApp Templates

  1. Changes
    - Add receiver_phone field to whatsapp_templates table
    - Allows users to specify recipient phone number as:
      * Fixed value: +918076175528
      * Variable: {{phone_number}}, {{contact_phone}}, {{assigned_to_phone}}
      * Combination: +91{{assigned_to_phone}}
    - Field is optional (nullable)

  2. Purpose
    - Gives flexibility to specify which phone number to use
    - Supports both direct phone numbers and template variables
    - Used in send_followup_whatsapp function to determine recipient

  3. Examples
    - Fixed: "+918076175528"
    - Variable: "{{contact_phone}}"
    - Variable: "{{assigned_to_phone}}"
    - Variable: "{{assigned_by_phone}}"
    - Combination: "+91{{phone_number}}"
*/

-- Add receiver_phone column to whatsapp_templates
ALTER TABLE whatsapp_templates
ADD COLUMN IF NOT EXISTS receiver_phone text;

COMMENT ON COLUMN whatsapp_templates.receiver_phone IS 'Phone number to send template to. Can be fixed (+918076175528) or variable ({{contact_phone}}, {{assigned_to_phone}})';

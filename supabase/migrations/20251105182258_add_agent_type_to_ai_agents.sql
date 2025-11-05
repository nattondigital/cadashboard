/*
  # Add Agent Type to AI Agents

  ## Changes
  
  1. Add agent_type column to ai_agents table
     - Values: 'BACKEND' or 'FRONTEND'
     - BACKEND: Internal AI employees for staff (no chat memory context)
     - FRONTEND: Customer-facing AI employees (with chat memory context)
     - Default: 'BACKEND' for backward compatibility
  
  2. Purpose
     - BACKEND agents perform CRM operations without conversation history
     - FRONTEND agents provide customer service with conversation context
     - Enables conditional chat memory loading for better performance
  
  3. Migration Strategy
     - Add column with default value 'BACKEND'
     - All existing agents become BACKEND type by default
     - New agents can be created as either type
*/

-- Add agent_type column to ai_agents table
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS agent_type text NOT NULL DEFAULT 'BACKEND' 
CHECK (agent_type IN ('BACKEND', 'FRONTEND'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_type ON ai_agents(agent_type);

-- Add comment to document the column
COMMENT ON COLUMN ai_agents.agent_type IS 'Agent classification: BACKEND (internal CRM operations, no memory context) or FRONTEND (customer-facing, with conversation history)';

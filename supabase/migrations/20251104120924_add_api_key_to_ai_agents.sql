/*
  # Add API Key to AI Agents

  1. Changes
    - Add `api_key` column to ai_agents table for OpenRouter/OpenAI API authentication
    - This is required for the ai-chat edge function to make LLM API calls

  2. Notes
    - API keys should be stored securely
    - Each agent can have its own API key for cost tracking and isolation
*/

-- Add api_key column to ai_agents table
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS api_key text;

-- Add comment for documentation
COMMENT ON COLUMN ai_agents.api_key IS 'OpenRouter or OpenAI API key for LLM calls';

/*
  # Remove API Key from AI Agents

  1. Changes
    - Remove `api_key` column from ai_agents table
    - API key will be fetched from integrations table instead (centralized configuration)

  2. Rationale
    - OpenRouter API key is already stored in integrations table
    - No need to duplicate it per agent
    - Centralized management is better
*/

-- Remove api_key column from ai_agents table
ALTER TABLE ai_agents
DROP COLUMN IF EXISTS api_key;

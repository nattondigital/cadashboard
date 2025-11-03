/**
 * Supabase client for MCP servers
 * Uses service_role_key for elevated permissions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from './logger.js';

const logger = createLogger('SupabaseClient');

let supabaseClient: SupabaseClient | null = null;

export const initializeSupabase = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const error = 'Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    logger.error(error);
    throw new Error(error);
  }

  logger.info('Initializing Supabase client', {
    url: supabaseUrl,
    keyPrefix: supabaseKey.substring(0, 20) + '...',
  });

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info('Supabase client initialized successfully');

  return supabaseClient;
};

export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
};

/**
 * Get the first active AI agent from the database
 * This allows MCP servers to work without manual agent_id configuration
 */
export const getActiveAgent = async (): Promise<{ id: string; name: string } | null> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_agents')
      .select('id, name')
      .eq('status', 'Active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching active agent', { error });
      return null;
    }

    if (!data) {
      logger.warn('No active AI agents found in database');
      return null;
    }

    logger.debug('Found active agent', { id: data.id, name: data.name });
    return { id: data.id, name: data.name };
  } catch (error: any) {
    logger.error('Failed to get active agent', { error: error.message });
    return null;
  }
};

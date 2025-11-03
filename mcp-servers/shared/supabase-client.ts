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

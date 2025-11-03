/**
 * Permission validation for AI agents
 */

import { getSupabase } from './supabase-client.js';
import { createLogger } from './logger.js';
import type { AgentPermissions, AIAgentPermission } from './types.js';

const logger = createLogger('PermissionValidator');

const permissionCache = new Map<string, Record<string, AgentPermissions>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  permissions: Record<string, AgentPermissions>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export class PermissionValidator {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  private async fetchPermissions(): Promise<Record<string, AgentPermissions>> {
    const cached = cache.get(this.agentId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('Using cached permissions', { agentId: this.agentId });
      return cached.permissions;
    }

    logger.debug('Fetching permissions from database', { agentId: this.agentId });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_agent_permissions')
      .select('permissions')
      .eq('agent_id', this.agentId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching permissions', { error, agentId: this.agentId });
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }

    if (!data) {
      logger.warn('No permissions found for agent', { agentId: this.agentId });
      return {};
    }

    const permissions = data.permissions as Record<string, AgentPermissions>;
    cache.set(this.agentId, { permissions, timestamp: Date.now() });

    logger.debug('Permissions fetched and cached', { agentId: this.agentId, permissions });

    return permissions;
  }

  async canPerform(module: string, action: 'view' | 'create' | 'edit' | 'delete'): Promise<boolean> {
    const permissions = await this.fetchPermissions();
    const modulePerms = permissions[module];

    if (!modulePerms) {
      logger.warn('No permissions for module', { module, agentId: this.agentId });
      return false;
    }

    const actionMap = {
      view: 'can_view',
      create: 'can_create',
      edit: 'can_edit',
      delete: 'can_delete',
    };

    const permKey = actionMap[action] as keyof AgentPermissions;
    const hasPermission = modulePerms[permKey] === true;

    logger.debug('Permission check', {
      agentId: this.agentId,
      module,
      action,
      hasPermission,
    });

    return hasPermission;
  }

  async validateOrThrow(module: string, action: 'view' | 'create' | 'edit' | 'delete'): Promise<void> {
    const canPerform = await this.canPerform(module, action);
    if (!canPerform) {
      const error = `Permission denied: Agent ${this.agentId} cannot ${action} ${module}`;
      logger.warn(error);
      throw new Error(error);
    }
  }

  static clearCache(agentId?: string): void {
    if (agentId) {
      cache.delete(agentId);
      logger.debug('Cleared cache for agent', { agentId });
    } else {
      cache.clear();
      logger.debug('Cleared all permission cache');
    }
  }
}

export const createPermissionValidator = (agentId: string): PermissionValidator => {
  return new PermissionValidator(agentId);
};

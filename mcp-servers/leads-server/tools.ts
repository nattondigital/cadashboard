/**
 * Lead tools for MCP server
 * Provides CRUD operations for leads
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import { createPermissionValidator } from '../shared/permission-validator.js';
import type { Lead, LeadFilters, MCPResponse } from '../shared/types.js';

const logger = createLogger('LeadTools');

async function logAction(
  agentId: string,
  agentName: string,
  action: string,
  result: 'Success' | 'Error',
  details: any = null,
  errorMessage: string | null = null
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('ai_agent_logs').insert({
      agent_id: agentId,
      agent_name: agentName,
      module: 'Leads',
      action,
      result,
      error_message: errorMessage,
      user_context: 'MCP Server',
      details,
    });
  } catch (error: any) {
    logger.error('Failed to log action', { error: error.message });
  }
}

export const tools = [
  {
    name: 'get_leads',
    description: 'Retrieve leads with advanced filtering and search capabilities. Use lead_id to get a specific lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'Get a specific lead by its lead_id',
        },
        id: {
          type: 'string',
          description: 'Get a specific lead by its UUID',
        },
        stage: {
          type: 'string',
          description: 'Filter by stage',
        },
        interest: {
          type: 'string',
          description: 'Filter by interest level',
          enum: ['Hot', 'Warm', 'Cold'],
        },
        source: {
          type: 'string',
          description: 'Filter by lead source',
          enum: ['Website', 'Referral', 'Social Media', 'Direct', 'Phone', 'Webinar', 'Import'],
        },
        owner: {
          type: 'string',
          description: 'Filter by lead owner',
        },
        pipeline_id: {
          type: 'string',
          description: 'Filter by pipeline ID',
        },
        lead_score_min: {
          type: 'number',
          description: 'Minimum lead score (0-100)',
        },
        lead_score_max: {
          type: 'number',
          description: 'Maximum lead score (0-100)',
        },
        search: {
          type: 'string',
          description: 'Search in lead name, email, phone, or company',
        },
        created_from: {
          type: 'string',
          description: 'Filter leads created on or after this date (YYYY-MM-DD)',
        },
        created_to: {
          type: 'string',
          description: 'Filter leads created on or before this date (YYYY-MM-DD)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of leads to return (default: 100)',
        },
        offset: {
          type: 'number',
          description: 'Number of leads to skip (for pagination)',
        },
      },
    },
  },
  {
    name: 'create_lead',
    description: 'Create a new lead',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Lead name',
        },
        email: {
          type: 'string',
          description: 'Email address',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        source: {
          type: 'string',
          description: 'Lead source',
          enum: ['Website', 'Referral', 'Social Media', 'Direct', 'Phone', 'Webinar', 'Import'],
        },
        interest: {
          type: 'string',
          description: 'Interest level',
          enum: ['Hot', 'Warm', 'Cold'],
          default: 'Warm',
        },
        stage: {
          type: 'string',
          description: 'Lead stage',
          default: 'new_lead',
        },
        owner: {
          type: 'string',
          description: 'Lead owner',
          default: 'Sales Team',
        },
        address: {
          type: 'string',
          description: 'Address',
        },
        company: {
          type: 'string',
          description: 'Company name',
        },
        notes: {
          type: 'string',
          description: 'Additional notes',
        },
        lead_score: {
          type: 'number',
          description: 'Lead score (0-100)',
          default: 50,
        },
        pipeline_id: {
          type: 'string',
          description: 'Pipeline ID',
        },
        affiliate_id: {
          type: 'string',
          description: 'Affiliate ID if referred',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_lead',
    description: 'Update an existing lead',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Lead UUID',
        },
        name: {
          type: 'string',
          description: 'Lead name',
        },
        email: {
          type: 'string',
          description: 'Email address',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        source: {
          type: 'string',
          description: 'Lead source',
        },
        interest: {
          type: 'string',
          description: 'Interest level',
          enum: ['Hot', 'Warm', 'Cold'],
        },
        stage: {
          type: 'string',
          description: 'Lead stage',
        },
        owner: {
          type: 'string',
          description: 'Lead owner',
        },
        address: {
          type: 'string',
          description: 'Address',
        },
        company: {
          type: 'string',
          description: 'Company name',
        },
        notes: {
          type: 'string',
          description: 'Additional notes',
        },
        lead_score: {
          type: 'number',
          description: 'Lead score (0-100)',
        },
        last_contact: {
          type: 'string',
          description: 'Last contact timestamp (ISO 8601)',
        },
        pipeline_id: {
          type: 'string',
          description: 'Pipeline ID',
        },
        affiliate_id: {
          type: 'string',
          description: 'Affiliate ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Delete a lead',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Lead UUID to delete',
        },
      },
      required: ['id'],
    },
  },
];

export async function callTool(
  name: string,
  args: any,
  agentId: string,
  agentName: string
): Promise<MCPResponse> {
  logger.info('Tool called', { name, args, agentId });

  const supabase = getSupabase();
  const validator = createPermissionValidator(agentId);

  try {
    if (name === 'get_leads') {
      await validator.validateOrThrow('Leads', 'view');

      let query = supabase.from('leads').select('*');

      if (args.lead_id) {
        query = query.eq('lead_id', args.lead_id);
      }

      if (args.id) {
        query = query.eq('id', args.id);
      }

      if (args.stage) query = query.eq('stage', args.stage);
      if (args.interest) query = query.eq('interest', args.interest);
      if (args.source) query = query.eq('source', args.source);
      if (args.owner) query = query.eq('owner', args.owner);
      if (args.pipeline_id) query = query.eq('pipeline_id', args.pipeline_id);
      if (args.lead_score_min !== undefined) query = query.gte('lead_score', args.lead_score_min);
      if (args.lead_score_max !== undefined) query = query.lte('lead_score', args.lead_score_max);
      if (args.created_from) query = query.gte('created_at', args.created_from);
      if (args.created_to) query = query.lte('created_at', args.created_to);

      if (args.search) {
        query = query.or(
          `name.ilike.%${args.search}%,email.ilike.%${args.search}%,phone.ilike.%${args.search}%,company.ilike.%${args.search}%`
        );
      }

      query = query.order('created_at', { ascending: false });

      if (args.limit) query = query.limit(args.limit);
      if (args.offset) query = query.range(args.offset, args.offset + (args.limit || 100) - 1);

      const { data, error } = await query;

      if (error) throw error;

      await logAction(agentId, agentName, 'get_leads', 'Success', {
        filters: args,
        count: data?.length || 0,
      });

      return {
        success: true,
        data: { leads: data || [], count: data?.length || 0 },
      };
    }

    if (name === 'create_lead') {
      await validator.validateOrThrow('Leads', 'create');

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          source: args.source || null,
          interest: args.interest || 'Warm',
          stage: args.stage || 'new_lead',
          owner: args.owner || 'Sales Team',
          address: args.address || null,
          company: args.company || null,
          notes: args.notes || null,
          lead_score: args.lead_score !== undefined ? args.lead_score : 50,
          pipeline_id: args.pipeline_id || null,
          affiliate_id: args.affiliate_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAction(agentId, agentName, 'create_lead', 'Success', {
        lead_id: data.id,
        name: data.name,
        lead_score: data.lead_score,
      });

      return {
        success: true,
        data: { lead: data },
      };
    }

    if (name === 'update_lead') {
      await validator.validateOrThrow('Leads', 'edit');

      const updates: any = { updated_at: new Date().toISOString() };
      if (args.name !== undefined) updates.name = args.name;
      if (args.email !== undefined) updates.email = args.email;
      if (args.phone !== undefined) updates.phone = args.phone;
      if (args.source !== undefined) updates.source = args.source;
      if (args.interest !== undefined) updates.interest = args.interest;
      if (args.stage !== undefined) updates.stage = args.stage;
      if (args.owner !== undefined) updates.owner = args.owner;
      if (args.address !== undefined) updates.address = args.address;
      if (args.company !== undefined) updates.company = args.company;
      if (args.notes !== undefined) updates.notes = args.notes;
      if (args.lead_score !== undefined) updates.lead_score = args.lead_score;
      if (args.last_contact !== undefined) updates.last_contact = args.last_contact;
      if (args.pipeline_id !== undefined) updates.pipeline_id = args.pipeline_id;
      if (args.affiliate_id !== undefined) updates.affiliate_id = args.affiliate_id;

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', args.id)
        .select()
        .single();

      if (error) throw error;

      await logAction(agentId, agentName, 'update_lead', 'Success', {
        lead_id: args.id,
        updates,
      });

      return {
        success: true,
        data: { lead: data },
      };
    }

    if (name === 'delete_lead') {
      await validator.validateOrThrow('Leads', 'delete');

      const { error } = await supabase.from('leads').delete().eq('id', args.id);

      if (error) throw error;

      await logAction(agentId, agentName, 'delete_lead', 'Success', {
        lead_id: args.id,
      });

      return {
        success: true,
        data: { deleted: true, lead_id: args.id },
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    logger.error('Tool execution failed', { name, error: error.message });

    await logAction(agentId, agentName, name, 'Error', { args }, error.message);

    return {
      success: false,
      error: {
        code: 'TOOL_ERROR',
        message: error.message,
        details: { name, args },
      },
    };
  }
}

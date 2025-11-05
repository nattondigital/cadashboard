/**
 * Contact tools for MCP server
 * Provides CRUD operations for contacts
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import { createPermissionValidator } from '../shared/permission-validator.js';
import type { Contact, ContactFilters, MCPResponse } from '../shared/types.js';

const logger = createLogger('ContactTools');

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
      module: 'Contacts',
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
    name: 'get_contacts',
    description: 'Retrieve contacts with advanced filtering and search capabilities. Use contact_id to get a specific contact.',
    inputSchema: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Get a specific contact by its contact_id',
        },
        id: {
          type: 'string',
          description: 'Get a specific contact by its UUID',
        },
        contact_type: {
          type: 'string',
          description: 'Filter by contact type',
          enum: ['Customer', 'Lead', 'Vendor', 'individual'],
        },
        status: {
          type: 'string',
          description: 'Filter by status',
          enum: ['Active', 'Inactive'],
        },
        city: {
          type: 'string',
          description: 'Filter by city',
        },
        state: {
          type: 'string',
          description: 'Filter by state',
        },
        search: {
          type: 'string',
          description: 'Search in contact name, email, phone, or business name',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (must have all specified tags)',
        },
        created_from: {
          type: 'string',
          description: 'Filter contacts created on or after this date (YYYY-MM-DD)',
        },
        created_to: {
          type: 'string',
          description: 'Filter contacts created on or before this date (YYYY-MM-DD)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return (default: 100)',
        },
        offset: {
          type: 'number',
          description: 'Number of contacts to skip (for pagination)',
        },
      },
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new contact',
    inputSchema: {
      type: 'object',
      properties: {
        full_name: {
          type: 'string',
          description: 'Full name of the contact',
        },
        email: {
          type: 'string',
          description: 'Email address',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        date_of_birth: {
          type: 'string',
          description: 'Date of birth (YYYY-MM-DD)',
        },
        gender: {
          type: 'string',
          description: 'Gender',
        },
        education_level: {
          type: 'string',
          description: 'Education level',
        },
        profession: {
          type: 'string',
          description: 'Profession',
        },
        experience: {
          type: 'string',
          description: 'Years of experience',
        },
        business_name: {
          type: 'string',
          description: 'Business name',
        },
        address: {
          type: 'string',
          description: 'Street address',
        },
        city: {
          type: 'string',
          description: 'City',
        },
        state: {
          type: 'string',
          description: 'State',
        },
        pincode: {
          type: 'string',
          description: 'PIN code',
        },
        gst_number: {
          type: 'string',
          description: 'GST number',
        },
        contact_type: {
          type: 'string',
          description: 'Type of contact',
          enum: ['Customer', 'Lead', 'Vendor', 'individual'],
          default: 'Customer',
        },
        status: {
          type: 'string',
          description: 'Contact status',
          enum: ['Active', 'Inactive'],
          default: 'Active',
        },
        notes: {
          type: 'string',
          description: 'Additional notes',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
      },
      required: ['full_name'],
    },
  },
  {
    name: 'update_contact',
    description: 'Update an existing contact',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Contact UUID',
        },
        full_name: {
          type: 'string',
          description: 'Full name of the contact',
        },
        email: {
          type: 'string',
          description: 'Email address',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        date_of_birth: {
          type: 'string',
          description: 'Date of birth (YYYY-MM-DD)',
        },
        gender: {
          type: 'string',
          description: 'Gender',
        },
        education_level: {
          type: 'string',
          description: 'Education level',
        },
        profession: {
          type: 'string',
          description: 'Profession',
        },
        experience: {
          type: 'string',
          description: 'Years of experience',
        },
        business_name: {
          type: 'string',
          description: 'Business name',
        },
        address: {
          type: 'string',
          description: 'Street address',
        },
        city: {
          type: 'string',
          description: 'City',
        },
        state: {
          type: 'string',
          description: 'State',
        },
        pincode: {
          type: 'string',
          description: 'PIN code',
        },
        gst_number: {
          type: 'string',
          description: 'GST number',
        },
        contact_type: {
          type: 'string',
          description: 'Type of contact',
          enum: ['Customer', 'Lead', 'Vendor', 'individual'],
        },
        status: {
          type: 'string',
          description: 'Contact status',
          enum: ['Active', 'Inactive'],
        },
        notes: {
          type: 'string',
          description: 'Additional notes',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
        last_contacted: {
          type: 'string',
          description: 'Last contacted timestamp (ISO 8601)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_contact',
    description: 'Delete a contact',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Contact UUID to delete',
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
    if (name === 'get_contacts') {
      await validator.validateOrThrow('Contacts', 'view');

      let query = supabase.from('contacts_master').select('*');

      if (args.contact_id) {
        query = query.eq('contact_id', args.contact_id);
      }

      if (args.id) {
        query = query.eq('id', args.id);
      }

      if (args.contact_type) query = query.eq('contact_type', args.contact_type);
      if (args.status) query = query.eq('status', args.status);
      if (args.city) query = query.ilike('city', args.city);
      if (args.state) query = query.ilike('state', args.state);
      if (args.created_from) query = query.gte('created_at', args.created_from);
      if (args.created_to) query = query.lte('created_at', args.created_to);

      if (args.search) {
        query = query.or(
          `full_name.ilike.%${args.search}%,email.ilike.%${args.search}%,phone.ilike.%${args.search}%,business_name.ilike.%${args.search}%`
        );
      }

      if (args.tags && Array.isArray(args.tags) && args.tags.length > 0) {
        query = query.contains('tags', args.tags);
      }

      query = query.order('created_at', { ascending: false });

      if (args.limit) query = query.limit(args.limit);
      if (args.offset) query = query.range(args.offset, args.offset + (args.limit || 100) - 1);

      const { data, error } = await query;

      if (error) throw error;

      await logAction(agentId, agentName, 'get_contacts', 'Success', {
        filters: args,
        count: data?.length || 0,
      });

      return {
        success: true,
        data: { contacts: data || [], count: data?.length || 0 },
      };
    }

    if (name === 'create_contact') {
      await validator.validateOrThrow('Contacts', 'create');

      const { data, error } = await supabase
        .from('contacts_master')
        .insert({
          full_name: args.full_name,
          email: args.email || null,
          phone: args.phone || null,
          date_of_birth: args.date_of_birth || null,
          gender: args.gender || null,
          education_level: args.education_level || null,
          profession: args.profession || null,
          experience: args.experience || null,
          business_name: args.business_name || null,
          address: args.address || null,
          city: args.city || null,
          state: args.state || null,
          pincode: args.pincode || null,
          gst_number: args.gst_number || null,
          contact_type: args.contact_type || 'Customer',
          status: args.status || 'Active',
          notes: args.notes || null,
          tags: args.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      await logAction(agentId, agentName, 'create_contact', 'Success', {
        contact_id: data.id,
        full_name: data.full_name,
      });

      return {
        success: true,
        data: { contact: data },
      };
    }

    if (name === 'update_contact') {
      await validator.validateOrThrow('Contacts', 'edit');

      const updates: any = { updated_at: new Date().toISOString() };
      if (args.full_name !== undefined) updates.full_name = args.full_name;
      if (args.email !== undefined) updates.email = args.email;
      if (args.phone !== undefined) updates.phone = args.phone;
      if (args.date_of_birth !== undefined) updates.date_of_birth = args.date_of_birth;
      if (args.gender !== undefined) updates.gender = args.gender;
      if (args.education_level !== undefined) updates.education_level = args.education_level;
      if (args.profession !== undefined) updates.profession = args.profession;
      if (args.experience !== undefined) updates.experience = args.experience;
      if (args.business_name !== undefined) updates.business_name = args.business_name;
      if (args.address !== undefined) updates.address = args.address;
      if (args.city !== undefined) updates.city = args.city;
      if (args.state !== undefined) updates.state = args.state;
      if (args.pincode !== undefined) updates.pincode = args.pincode;
      if (args.gst_number !== undefined) updates.gst_number = args.gst_number;
      if (args.contact_type !== undefined) updates.contact_type = args.contact_type;
      if (args.status !== undefined) updates.status = args.status;
      if (args.notes !== undefined) updates.notes = args.notes;
      if (args.tags !== undefined) updates.tags = args.tags;
      if (args.last_contacted !== undefined) updates.last_contacted = args.last_contacted;

      const { data, error } = await supabase
        .from('contacts_master')
        .update(updates)
        .eq('id', args.id)
        .select()
        .single();

      if (error) throw error;

      await logAction(agentId, agentName, 'update_contact', 'Success', {
        contact_id: args.id,
        updates,
      });

      return {
        success: true,
        data: { contact: data },
      };
    }

    if (name === 'delete_contact') {
      await validator.validateOrThrow('Contacts', 'delete');

      const { error } = await supabase.from('contacts_master').delete().eq('id', args.id);

      if (error) throw error;

      await logAction(agentId, agentName, 'delete_contact', 'Success', {
        contact_id: args.id,
      });

      return {
        success: true,
        data: { deleted: true, contact_id: args.id },
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

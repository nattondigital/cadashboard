/**
 * Task tools for MCP server
 * Provides CRUD operations for tasks
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import { createPermissionValidator } from '../shared/permission-validator.js';
import type { Task, TaskFilters, MCPResponse } from '../shared/types.js';

const logger = createLogger('TaskTools');

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
      module: 'Tasks',
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
    name: 'get_tasks',
    description: 'Retrieve tasks with advanced filtering and search capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status',
          enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
        },
        priority: {
          type: 'string',
          description: 'Filter by priority',
          enum: ['Low', 'Medium', 'High', 'Urgent'],
        },
        assigned_to: {
          type: 'string',
          description: 'Filter by assigned user ID',
        },
        contact_id: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        due_date_from: {
          type: 'string',
          description: 'Filter tasks due on or after this date (YYYY-MM-DD)',
        },
        due_date_to: {
          type: 'string',
          description: 'Filter tasks due on or before this date (YYYY-MM-DD)',
        },
        search: {
          type: 'string',
          description: 'Search in task title and description',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 100)',
        },
        offset: {
          type: 'number',
          description: 'Number of tasks to skip (for pagination)',
        },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        status: {
          type: 'string',
          description: 'Task status',
          enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
          default: 'To Do',
        },
        priority: {
          type: 'string',
          description: 'Task priority',
          enum: ['Low', 'Medium', 'High', 'Urgent'],
          default: 'Medium',
        },
        due_date: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD)',
        },
        due_time: {
          type: 'string',
          description: 'Due time (HH:MM)',
        },
        contact_id: {
          type: 'string',
          description: 'Associated contact ID',
        },
        assigned_to: {
          type: 'string',
          description: 'Assigned user ID',
        },
        assigned_to_name: {
          type: 'string',
          description: 'Assigned user name',
        },
        supporting_docs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of supporting document URLs',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Task ID',
        },
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        status: {
          type: 'string',
          description: 'Task status',
          enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
        },
        priority: {
          type: 'string',
          description: 'Task priority',
          enum: ['Low', 'Medium', 'High', 'Urgent'],
        },
        due_date: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD)',
        },
        due_time: {
          type: 'string',
          description: 'Due time (HH:MM)',
        },
        contact_id: {
          type: 'string',
          description: 'Associated contact ID',
        },
        assigned_to: {
          type: 'string',
          description: 'Assigned user ID',
        },
        assigned_to_name: {
          type: 'string',
          description: 'Assigned user name',
        },
        supporting_docs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of supporting document URLs',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Task ID to delete',
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
    if (name === 'get_tasks') {
      await validator.validateOrThrow('Tasks', 'view');

      let query = supabase.from('tasks').select('*');

      if (args.status) query = query.eq('status', args.status);
      if (args.priority) query = query.eq('priority', args.priority);
      if (args.assigned_to) query = query.eq('assigned_to', args.assigned_to);
      if (args.contact_id) query = query.eq('contact_id', args.contact_id);
      if (args.due_date_from) query = query.gte('due_date', args.due_date_from);
      if (args.due_date_to) query = query.lte('due_date', args.due_date_to);

      if (args.search) {
        query = query.or(`title.ilike.%${args.search}%,description.ilike.%${args.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      if (args.limit) query = query.limit(args.limit);
      if (args.offset) query = query.range(args.offset, args.offset + (args.limit || 100) - 1);

      const { data, error } = await query;

      if (error) throw error;

      await logAction(agentId, agentName, 'get_tasks', 'Success', {
        filters: args,
        count: data?.length || 0,
      });

      return {
        success: true,
        data: { tasks: data || [], count: data?.length || 0 },
      };
    }

    if (name === 'create_task') {
      await validator.validateOrThrow('Tasks', 'create');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: args.title,
          description: args.description || null,
          status: args.status || 'To Do',
          priority: args.priority || 'Medium',
          due_date: args.due_date || null,
          due_time: args.due_time || null,
          contact_id: args.contact_id || null,
          assigned_to: args.assigned_to || null,
          assigned_to_name: args.assigned_to_name || null,
          supporting_docs: args.supporting_docs || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAction(agentId, agentName, 'create_task', 'Success', {
        task_id: data.id,
        title: data.title,
      });

      return {
        success: true,
        data: { task: data },
      };
    }

    if (name === 'update_task') {
      await validator.validateOrThrow('Tasks', 'edit');

      const updates: any = {};
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.status !== undefined) updates.status = args.status;
      if (args.priority !== undefined) updates.priority = args.priority;
      if (args.due_date !== undefined) updates.due_date = args.due_date;
      if (args.due_time !== undefined) updates.due_time = args.due_time;
      if (args.contact_id !== undefined) updates.contact_id = args.contact_id;
      if (args.assigned_to !== undefined) updates.assigned_to = args.assigned_to;
      if (args.assigned_to_name !== undefined) updates.assigned_to_name = args.assigned_to_name;
      if (args.supporting_docs !== undefined) updates.supporting_docs = args.supporting_docs;

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', args.id)
        .select()
        .single();

      if (error) throw error;

      await logAction(agentId, agentName, 'update_task', 'Success', {
        task_id: args.id,
        updates,
      });

      return {
        success: true,
        data: { task: data },
      };
    }

    if (name === 'delete_task') {
      await validator.validateOrThrow('Tasks', 'delete');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', args.id);

      if (error) throw error;

      await logAction(agentId, agentName, 'delete_task', 'Success', {
        task_id: args.id,
      });

      return {
        success: true,
        data: { deleted: true, task_id: args.id },
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

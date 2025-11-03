/**
 * Task resources for MCP server
 * Provides read-only access to task data
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import type { Task, TaskStatistics } from '../shared/types.js';

const logger = createLogger('TaskResources');

export const resources = [
  {
    uri: 'tasks://all',
    name: 'All Tasks',
    description: 'Complete list of all tasks in the system',
    mimeType: 'application/json',
  },
  {
    uri: 'tasks://pending',
    name: 'Pending Tasks',
    description: 'Tasks with status "To Do" or "In Progress"',
    mimeType: 'application/json',
  },
  {
    uri: 'tasks://overdue',
    name: 'Overdue Tasks',
    description: 'Tasks that are past their due date',
    mimeType: 'application/json',
  },
  {
    uri: 'tasks://high-priority',
    name: 'High Priority Tasks',
    description: 'Tasks with priority "High" or "Urgent"',
    mimeType: 'application/json',
  },
  {
    uri: 'tasks://statistics',
    name: 'Task Statistics',
    description: 'Aggregate statistics about tasks',
    mimeType: 'application/json',
  },
  {
    uri: 'tasks://task/{id}',
    name: 'Individual Task',
    description: 'Get details of a specific task by ID',
    mimeType: 'application/json',
  },
];

export async function readResource(uri: string): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
  logger.info('Reading resource', { uri });

  const supabase = getSupabase();

  try {
    if (uri === 'tasks://all') {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'tasks://pending') {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['To Do', 'In Progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'tasks://overdue') {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .lt('due_date', today)
        .in('status', ['To Do', 'In Progress'])
        .order('due_date', { ascending: true });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'tasks://high-priority') {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('priority', ['High', 'Urgent'])
        .in('status', ['To Do', 'In Progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'tasks://statistics') {
      const { data: allTasks, error } = await supabase
        .from('tasks')
        .select('status, priority, due_date');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const statistics: TaskStatistics = {
        total: allTasks?.length || 0,
        by_status: {
          'To Do': 0,
          'In Progress': 0,
          'Completed': 0,
          'Cancelled': 0,
        },
        by_priority: {
          'Low': 0,
          'Medium': 0,
          'High': 0,
          'Urgent': 0,
        },
        overdue: 0,
        due_today: 0,
        due_this_week: 0,
      };

      allTasks?.forEach((task: any) => {
        if (task.status) statistics.by_status[task.status as keyof typeof statistics.by_status]++;
        if (task.priority) statistics.by_priority[task.priority as keyof typeof statistics.by_priority]++;

        if (task.due_date) {
          if (task.due_date < today && (task.status === 'To Do' || task.status === 'In Progress')) {
            statistics.overdue++;
          }
          if (task.due_date === today) {
            statistics.due_today++;
          }
          if (task.due_date <= weekFromNow && task.due_date >= today) {
            statistics.due_this_week++;
          }
        }
      });

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(statistics, null, 2),
        }],
      };
    }

    if (uri.startsWith('tasks://task/')) {
      const taskId = uri.replace('tasks://task/', '');

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(`Task not found: ${taskId}`);
      }

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        }],
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  } catch (error: any) {
    logger.error('Error reading resource', { uri, error: error.message });
    throw error;
  }
}

/**
 * Shared type definitions for MCP servers
 */

export interface Task {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  status: 'To Do' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  due_date: string | null;
  due_time: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  supporting_docs: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigned_to?: string;
  contact_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TaskStatistics {
  total: number;
  by_status: {
    'To Do': number;
    'In Progress': number;
    'Completed': number;
    'Cancelled': number;
  };
  by_priority: {
    'Low': number;
    'Medium': number;
    'High': number;
    'Urgent': number;
  };
  overdue: number;
  due_today: number;
  due_this_week: number;
}

export interface AgentPermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AIAgentPermission {
  agent_id: string;
  permissions: Record<string, AgentPermissions>;
}

export interface AIAgentLog {
  id: string;
  agent_id: string;
  agent_name: string;
  module: string;
  action: string;
  result: 'Success' | 'Error';
  error_message: string | null;
  user_context: string;
  details: Record<string, any> | null;
  created_at: string;
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}

export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: MCPError;
}

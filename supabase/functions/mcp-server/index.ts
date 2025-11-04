import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, Accept, Mcp-Session-Id',
}

interface MCPMessage {
  jsonrpc: '2.0'
  id?: string | number
  method?: string
  params?: any
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

// Session storage (in-memory for demo, use Supabase for production)
const sessions = new Map<string, { agentId?: string; initialized: boolean }>()

function generateSessionId(): string {
  return `mcp-session-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

function createSSEMessage(message: MCPMessage): string {
  return `data: ${JSON.stringify(message)}\n\n`
}

async function handleMCPRequest(
  message: MCPMessage,
  sessionId: string,
  supabase: any
): Promise<MCPMessage> {
  const { method, params, id } = message

  const response: MCPMessage = {
    jsonrpc: '2.0',
    id: id || 1,
  }

  try {
    switch (method) {
      case 'initialize': {
        // Extract agent_id from client info if provided
        const clientInfo = params?.clientInfo
        const agentId = clientInfo?.agentId || params?.agentId

        // Store session with agent_id
        sessions.set(sessionId, {
          initialized: true,
          agentId: agentId
        })

        console.log('MCP session initialized', { sessionId, agentId })

        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: 'crm-tasks-mcp-server',
            version: '1.0.0',
          },
        }
        break
      }

      case 'tools/list': {
        response.result = {
          tools: [
            {
              name: 'get_tasks',
              description: 'Retrieve tasks with advanced filtering. Use task_id to get a specific task.',
              inputSchema: {
                type: 'object',
                properties: {
                  agent_id: {
                    type: 'string',
                    description: 'AI Agent ID for permission checking',
                  },
                  task_id: {
                    type: 'string',
                    description: 'Get a specific task by its task_id (e.g., TASK-10031)',
                  },
                  status: {
                    type: 'string',
                    enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
                  },
                  priority: {
                    type: 'string',
                    enum: ['Low', 'Medium', 'High', 'Urgent'],
                  },
                  limit: {
                    type: 'number',
                    description: 'Maximum number of tasks to return (default: 100)',
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
                  agent_id: {
                    type: 'string',
                    description: 'AI Agent ID for permission checking',
                  },
                  title: {
                    type: 'string',
                    description: 'Task title',
                  },
                  description: {
                    type: 'string',
                    description: 'Task description',
                  },
                  priority: {
                    type: 'string',
                    enum: ['Low', 'Medium', 'High', 'Urgent'],
                    description: 'Task priority (default: Medium)',
                  },
                  status: {
                    type: 'string',
                    enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
                    description: 'Task status (default: To Do)',
                  },
                  assigned_to: {
                    type: 'string',
                    description: 'UUID of assigned team member',
                  },
                  assigned_to_name: {
                    type: 'string',
                    description: 'Name of assigned team member (e.g., "Amit", "Prince")',
                  },
                  contact_id: {
                    type: 'string',
                    description: 'UUID of related contact',
                  },
                  due_date: {
                    type: 'string',
                    description: 'Due date (YYYY-MM-DD format)',
                  },
                  due_time: {
                    type: 'string',
                    description: 'Due time (HH:MM format, 24-hour)',
                  },
                  supporting_docs: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of document URLs or file paths',
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
                  agent_id: {
                    type: 'string',
                    description: 'AI Agent ID for permission checking',
                  },
                  task_id: {
                    type: 'string',
                    description: 'Task ID to update (e.g., TASK-10031)',
                  },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
                  },
                  priority: {
                    type: 'string',
                    enum: ['Low', 'Medium', 'High', 'Urgent'],
                  },
                  assigned_to: { type: 'string' },
                  due_date: { type: 'string' },
                },
                required: ['task_id'],
              },
            },
            {
              name: 'delete_task',
              description: 'Delete a task by task_id',
              inputSchema: {
                type: 'object',
                properties: {
                  agent_id: {
                    type: 'string',
                    description: 'AI Agent ID for permission checking',
                  },
                  task_id: {
                    type: 'string',
                    description: 'Task ID to delete (e.g., TASK-10031)',
                  },
                },
                required: ['task_id'],
              },
            },
          ],
        }
        break
      }

      case 'tools/call': {
        const { name, arguments: args } = params
        const agentId = args?.agent_id

        if (!agentId) {
          throw new Error('agent_id is required in arguments')
        }

        // Check agent permissions
        const { data: permissions, error: permError } = await supabase
          .from('ai_agent_permissions')
          .select('permissions')
          .eq('agent_id', agentId)
          .maybeSingle()

        if (permError || !permissions) {
          throw new Error('Agent not found or no permissions set')
        }

        const taskPerms = permissions.permissions?.Tasks || {}

        switch (name) {
          case 'get_tasks': {
            if (!taskPerms.can_view) {
              throw new Error('Agent does not have permission to view tasks')
            }

            let query = supabase
              .from('tasks')
              .select('*')
              .order('created_at', { ascending: false })

            if (args.task_id) {
              query = query.eq('task_id', args.task_id)
            }
            if (args.status) {
              query = query.eq('status', args.status)
            }
            if (args.priority) {
              query = query.eq('priority', args.priority)
            }
            if (args.limit) {
              query = query.limit(args.limit)
            } else {
              query = query.limit(100)
            }

            const { data, error } = await query

            if (error) throw error

            // Log action
            await supabase.from('ai_agent_logs').insert({
              agent_id: agentId,
              action: 'get_tasks',
              details: { filters: args, result_count: data?.length || 0 },
            })

            response.result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            }
            break
          }

          case 'create_task': {
            if (!taskPerms.can_create) {
              throw new Error('Agent does not have permission to create tasks')
            }

            // Combine due_date and due_time into a single timestamp
            let dueDateTimestamp = null
            if (args.due_date) {
              if (args.due_time) {
                // Combine date and time: "2025-11-06" + "15:00" = "2025-11-06T15:00:00"
                dueDateTimestamp = `${args.due_date}T${args.due_time}:00`
              } else {
                // Just date, set to start of day
                dueDateTimestamp = `${args.due_date}T00:00:00`
              }
            }

            // If assigned_to_name is provided but not assigned_to UUID, look it up
            let assignedToUuid = args.assigned_to || null
            if (args.assigned_to_name && !assignedToUuid) {
              const { data: userData } = await supabase
                .from('admin_users')
                .select('id')
                .ilike('full_name', `%${args.assigned_to_name}%`)
                .limit(1)
                .maybeSingle()

              if (userData) {
                assignedToUuid = userData.id
              }
            }

            const taskData = {
              title: args.title,
              description: args.description || null,
              priority: args.priority || 'Medium',
              status: args.status || 'To Do',
              assigned_to: assignedToUuid,
              contact_id: args.contact_id || null,
              due_date: dueDateTimestamp,
              supporting_documents: args.supporting_docs || null,
            }

            const { data, error } = await supabase
              .from('tasks')
              .insert(taskData)
              .select()
              .single()

            if (error) throw error

            // Log action
            await supabase.from('ai_agent_logs').insert({
              agent_id: agentId,
              action: 'create_task',
              details: { task_id: data.task_id, title: args.title },
            })

            response.result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Task created successfully',
                    task: data
                  }, null, 2),
                },
              ],
            }
            break
          }

          case 'update_task': {
            if (!taskPerms.can_edit) {
              throw new Error('Agent does not have permission to edit tasks')
            }

            const { task_id, ...updates } = args
            delete updates.agent_id

            const { data, error } = await supabase
              .from('tasks')
              .update(updates)
              .eq('task_id', task_id)
              .select()
              .single()

            if (error) throw error

            // Log action
            await supabase.from('ai_agent_logs').insert({
              agent_id: agentId,
              action: 'update_task',
              details: { task_id, updates },
            })

            response.result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            }
            break
          }

          case 'delete_task': {
            if (!taskPerms.can_delete) {
              throw new Error('Agent does not have permission to delete tasks')
            }

            const { error } = await supabase
              .from('tasks')
              .delete()
              .eq('task_id', args.task_id)

            if (error) throw error

            // Log action
            await supabase.from('ai_agent_logs').insert({
              agent_id: agentId,
              action: 'delete_task',
              details: { task_id: args.task_id },
            })

            response.result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, message: 'Task deleted successfully', task_id: args.task_id }),
                },
              ],
            }
            break
          }

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
        break
      }

      default:
        throw new Error(`Unknown method: ${method}`)
    }
  } catch (error: any) {
    console.error('MCP request error:', error)
    response.error = {
      code: -32603,
      message: error.message || 'Internal error',
      data: error.stack,
    }
  }

  return response
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let sessionId = req.headers.get('Mcp-Session-Id') || generateSessionId()

    const body = await req.json()
    const response = await handleMCPRequest(body, sessionId, supabase)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId,
      },
    })
  } catch (error: any) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message,
        },
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})

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

      case 'resources/list': {
        response.result = {
          resources: [
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
          ],
        }
        break
      }

      case 'resources/read': {
        const { uri } = params

        if (!uri) {
          throw new Error('uri parameter is required')
        }

        if (uri === 'tasks://all') {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error

          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
            }],
          }
        } else if (uri === 'tasks://pending') {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('status', ['To Do', 'In Progress'])
            .order('priority', { ascending: false })
            .order('due_date', { ascending: true })

          if (error) throw error

          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
            }],
          }
        } else if (uri === 'tasks://overdue') {
          const today = new Date().toISOString().split('T')[0]

          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .lt('due_date', today)
            .in('status', ['To Do', 'In Progress'])
            .order('due_date', { ascending: true })

          if (error) throw error

          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
            }],
          }
        } else if (uri === 'tasks://high-priority') {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('priority', ['High', 'Urgent'])
            .in('status', ['To Do', 'In Progress'])
            .order('priority', { ascending: false })
            .order('due_date', { ascending: true })

          if (error) throw error

          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ tasks: data || [], count: data?.length || 0 }, null, 2),
            }],
          }
        } else if (uri === 'tasks://statistics') {
          const { data: allTasks, error } = await supabase
            .from('tasks')
            .select('status, priority, due_date')

          if (error) throw error

          const today = new Date().toISOString().split('T')[0]
          const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

          const statistics = {
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
          }

          allTasks?.forEach((task: any) => {
            if (task.status) statistics.by_status[task.status as keyof typeof statistics.by_status]++
            if (task.priority) statistics.by_priority[task.priority as keyof typeof statistics.by_priority]++

            if (task.due_date) {
              if (task.due_date < today && (task.status === 'To Do' || task.status === 'In Progress')) {
                statistics.overdue++
              }
              if (task.due_date === today) {
                statistics.due_today++
              }
              if (task.due_date <= weekFromNow && task.due_date >= today) {
                statistics.due_this_week++
              }
            }
          })

          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(statistics, null, 2),
            }],
          }
        } else if (uri.startsWith('tasks://task/')) {
          const taskId = uri.replace('tasks://task/', '')

          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .maybeSingle()

          if (error) throw error

          if (!data) {
            throw new Error(`Task not found: ${taskId}`)
          }

          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            }],
          }
        } else {
          throw new Error(`Unknown resource URI: ${uri}`)
        }
        break
      }

      case 'prompts/list': {
        response.result = {
          prompts: [
            {
              name: 'task_summary',
              description: 'Generate a comprehensive summary of current tasks with statistics and insights',
              arguments: [
                {
                  name: 'include_overdue',
                  description: 'Whether to include overdue tasks in the summary',
                  required: false,
                },
                {
                  name: 'include_high_priority',
                  description: 'Whether to include high-priority tasks in the summary',
                  required: false,
                },
              ],
            },
            {
              name: 'task_creation_guide',
              description: 'Best practices and guidelines for creating well-structured tasks',
              arguments: [],
            },
            {
              name: 'task_prioritization',
              description: 'Recommendations for prioritizing and organizing tasks',
              arguments: [
                {
                  name: 'user_context',
                  description: 'Information about the user or team to personalize recommendations',
                  required: false,
                },
              ],
            },
            {
              name: 'overdue_alert',
              description: 'Generate an alert message for overdue tasks that need attention',
              arguments: [],
            },
            {
              name: 'get_task_by_id',
              description: 'Instructions for retrieving a specific task by its task_id (e.g., TASK-10031)',
              arguments: [
                {
                  name: 'task_id',
                  description: 'The task ID to retrieve (e.g., TASK-10031)',
                  required: true,
                },
              ],
            },
          ],
        }
        break
      }

      case 'prompts/get': {
        const { name, arguments: args = {} } = params

        if (!name) {
          throw new Error('prompt name is required')
        }

        if (name === 'task_summary') {
          const { data: allTasks } = await supabase.from('tasks').select('*')

          const today = new Date().toISOString().split('T')[0]
          const pending = allTasks?.filter((t: any) => t.status === 'To Do' || t.status === 'In Progress') || []
          const overdue = allTasks?.filter((t: any) => t.due_date < today && (t.status === 'To Do' || t.status === 'In Progress')) || []
          const highPriority = allTasks?.filter((t: any) => (t.priority === 'High' || t.priority === 'Urgent') && (t.status === 'To Do' || t.status === 'In Progress')) || []

          let summary = `# Task Management Summary\n\n`
          summary += `## Overview\n`
          summary += `- **Total Tasks**: ${allTasks?.length || 0}\n`
          summary += `- **Pending Tasks**: ${pending.length}\n`
          summary += `- **Completed Tasks**: ${allTasks?.filter((t: any) => t.status === 'Completed').length || 0}\n\n`

          if (args.include_overdue !== false && overdue.length > 0) {
            summary += `## ⚠️ Overdue Tasks (${overdue.length})\n\n`
            overdue.forEach((task: any) => {
              summary += `- **${task.title}** (Due: ${task.due_date}, Priority: ${task.priority})\n`
            })
            summary += `\n`
          }

          if (args.include_high_priority !== false && highPriority.length > 0) {
            summary += `## 🔥 High Priority Tasks (${highPriority.length})\n\n`
            highPriority.slice(0, 5).forEach((task: any) => {
              summary += `- **${task.title}** (Priority: ${task.priority}, Due: ${task.due_date || 'Not set'})\n`
            })
            if (highPriority.length > 5) {
              summary += `\n...and ${highPriority.length - 5} more\n`
            }
            summary += `\n`
          }

          summary += `## Status Breakdown\n`
          const statusCounts = {
            'To Do': allTasks?.filter((t: any) => t.status === 'To Do').length || 0,
            'In Progress': allTasks?.filter((t: any) => t.status === 'In Progress').length || 0,
            'Completed': allTasks?.filter((t: any) => t.status === 'Completed').length || 0,
            'Cancelled': allTasks?.filter((t: any) => t.status === 'Cancelled').length || 0,
          }
          Object.entries(statusCounts).forEach(([status, count]) => {
            summary += `- ${status}: ${count}\n`
          })

          response.result = {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: summary,
                },
              },
            ],
          }
        } else if (name === 'task_creation_guide') {
          const guide = `# Task Creation Best Practices

## Essential Components of a Well-Structured Task

### 1. Clear and Actionable Title
- Start with an action verb (e.g., "Review", "Update", "Create", "Contact")
- Be specific and concise
- Avoid vague language

**Good Examples:**
- "Review Q4 financial report and provide feedback"
- "Update customer database with new contacts"
- "Contact John Smith regarding project timeline"

**Bad Examples:**
- "Finance stuff"
- "Customer thing"
- "Follow up"

### 2. Detailed Description
- Explain the context and purpose
- List specific requirements or deliverables
- Include relevant links or references
- Note any dependencies or prerequisites

### 3. Appropriate Priority
- **Urgent**: Requires immediate attention, blocks other work
- **High**: Important and time-sensitive
- **Medium**: Standard priority, normal workflow
- **Low**: Can be done when time permits

### 4. Realistic Due Date
- Consider task complexity
- Account for dependencies
- Allow buffer time for review
- Coordinate with assignee's availability

### 5. Clear Assignment
- Assign to the most appropriate team member
- Ensure assignee has necessary skills and resources
- Consider current workload

### 6. Supporting Documentation
- Attach relevant files or documents
- Link to related tasks or projects
- Include screenshots or examples if helpful

## Task Management Tips

1. **Break down large tasks**: If a task takes more than 4-8 hours, consider breaking it into smaller subtasks
2. **Regular updates**: Update task status as work progresses
3. **Communication**: Use task comments for questions and updates
4. **Review cycle**: Regularly review and reprioritize tasks
5. **Complete promptly**: Mark tasks as complete when done to maintain accurate metrics

## Common Mistakes to Avoid

- Creating tasks that are too vague
- Setting unrealistic deadlines
- Forgetting to assign tasks
- Not updating task status
- Creating duplicate tasks
- Missing priority indicators`

          response.result = {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: guide,
                },
              },
            ],
          }
        } else if (name === 'task_prioritization') {
          const context = args.user_context ? `\n\nUser Context: ${args.user_context}\n` : ''

          const recommendations = `# Task Prioritization Framework${context}

## The RICE Method

Prioritize tasks based on:
- **Reach**: How many people are impacted?
- **Impact**: What's the magnitude of the effect?
- **Confidence**: How certain are you about the estimates?
- **Effort**: How much time/resources required?

## Priority Matrix

### Urgent + Important (Do First)
- Critical bugs or issues
- Deadline-driven deliverables
- Emergency requests
- Compliance requirements

### Important but Not Urgent (Schedule)
- Strategic planning
- Relationship building
- Process improvements
- Professional development

### Urgent but Not Important (Delegate)
- Some meetings
- Minor requests
- Routine tasks
- Low-impact interruptions

### Neither Urgent nor Important (Eliminate)
- Busy work
- Time wasters
- Outdated tasks
- Nice-to-haves with no clear value

## Daily Prioritization Tips

1. **Start with the MITs**: Identify 3 Most Important Tasks each morning
2. **Time-block high-priority work**: Protect focus time for critical tasks
3. **Batch similar tasks**: Group related activities for efficiency
4. **Limit WIP**: Work on 3-5 tasks at a time maximum
5. **Review and adjust**: Reprioritize as new information emerges

## Red Flags for Reprioritization

- Overdue tasks accumulating
- High-priority tasks sitting idle
- Team members overloaded
- Shifting business priorities
- External dependencies resolved
- New urgent requests

## Recommended Actions

1. Review all "To Do" tasks weekly
2. Adjust priorities based on current goals
3. Break down large tasks that are stuck
4. Archive or delete tasks no longer relevant
5. Ensure balanced workload across team`

          response.result = {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: recommendations,
                },
              },
            ],
          }
        } else if (name === 'overdue_alert') {
          const today = new Date().toISOString().split('T')[0]
          const { data: overdueTasks } = await supabase
            .from('tasks')
            .select('*')
            .lt('due_date', today)
            .in('status', ['To Do', 'In Progress'])
            .order('due_date', { ascending: true })

          if (!overdueTasks || overdueTasks.length === 0) {
            response.result = {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: '# Task Status: All Clear!\n\n✅ Great news! You have no overdue tasks at the moment.\n\nKeep up the excellent work on staying on top of your deadlines!',
                  },
                },
              ],
            }
          } else {
            let alert = `# ⚠️ Overdue Tasks Alert\n\n`
            alert += `You have **${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}** that need immediate attention:\n\n`

            overdueTasks.forEach((task: any, index: number) => {
              const daysOverdue = Math.floor((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))
              alert += `${index + 1}. **${task.title}**\n`
              alert += `   - Priority: ${task.priority}\n`
              alert += `   - Due Date: ${task.due_date} (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)\n`
              alert += `   - Status: ${task.status}\n`
              if (task.assigned_to_name) {
                alert += `   - Assigned to: ${task.assigned_to_name}\n`
              }
              alert += `\n`
            })

            alert += `## Recommended Actions\n\n`
            alert += `1. Review each overdue task and update status if completed\n`
            alert += `2. For active tasks, assess if deadlines need adjustment\n`
            alert += `3. Prioritize overdue high-priority items immediately\n`
            alert += `4. Consider reassigning tasks if assignees are overloaded\n`
            alert += `5. Break down large overdue tasks into smaller, manageable pieces\n`

            response.result = {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: alert,
                  },
                },
              ],
            }
          }
        } else if (name === 'get_task_by_id') {
          const taskId = args.task_id
          if (!taskId) {
            response.result = {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: '# How to Retrieve a Task by ID\n\nTo get details of a specific task, use the `get_tasks` tool with the `task_id` parameter:\n\n```json\n{\n  "task_id": "TASK-10031"\n}\n```\n\nThis will return the complete task details including:\n- Task title and description\n- Status and priority\n- Assigned user and contact information\n- Due dates and progress\n- Supporting documents',
                  },
                },
              ],
            }
          } else {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('*')
              .eq('task_id', taskId)

            if (!tasks || tasks.length === 0) {
              response.result = {
                messages: [
                  {
                    role: 'user',
                    content: {
                      type: 'text',
                      text: `# Task Not Found\n\nTask **${taskId}** was not found in the system.\n\nPlease verify the task ID and try again.`,
                    },
                  },
                ],
              }
            } else {
              const task = tasks[0]
              let details = `# Task Details: ${task.task_id}\n\n`
              details += `## ${task.title}\n\n`

              if (task.description) {
                details += `**Description:** ${task.description}\n\n`
              }

              details += `### Status & Priority\n`
              details += `- **Status:** ${task.status}\n`
              details += `- **Priority:** ${task.priority}\n`
              details += `- **Progress:** ${task.progress_percentage}%\n\n`

              details += `### Assignment\n`
              details += `- **Assigned to:** ${task.assigned_to_name || 'Unassigned'}\n`
              details += `- **Assigned by:** ${task.assigned_by_name || 'N/A'}\n\n`

              if (task.contact_name) {
                details += `### Contact Information\n`
                details += `- **Contact:** ${task.contact_name}\n`
                if (task.contact_phone) {
                  details += `- **Phone:** ${task.contact_phone}\n`
                }
                details += `\n`
              }

              details += `### Dates\n`
              if (task.start_date) {
                details += `- **Start Date:** ${task.start_date}\n`
              }
              if (task.due_date) {
                details += `- **Due Date:** ${task.due_date}\n`
              }
              if (task.completion_date) {
                details += `- **Completed:** ${task.completion_date}\n`
              }
              details += `- **Created:** ${task.created_at}\n`
              details += `- **Last Updated:** ${task.updated_at}\n\n`

              if (task.supporting_documents && task.supporting_documents.length > 0) {
                details += `### Supporting Documents\n`
                task.supporting_documents.forEach((doc: string, index: number) => {
                  details += `${index + 1}. ${doc}\n`
                })
                details += `\n`
              }

              if (task.category) {
                details += `**Category:** ${task.category}\n`
              }

              response.result = {
                messages: [
                  {
                    role: 'user',
                    content: {
                      type: 'text',
                      text: details,
                    },
                  },
                ],
              }
            }
          }
        } else {
          throw new Error(`Unknown prompt: ${name}`)
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

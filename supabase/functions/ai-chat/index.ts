import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface ChatPayload {
  agent_id: string
  phone_number: string
  message: string
  user_context?: string
}

interface MCPMessage {
  jsonrpc: '2.0'
  id: string | number
  method?: string
  params?: any
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

class MCPClient {
  private serverUrl: string
  private authToken: string
  private agentId: string
  private requestId: number = 0
  private sessionId?: string

  constructor(serverUrl: string, authToken: string, agentId: string) {
    this.serverUrl = serverUrl
    this.authToken = authToken
    this.agentId = agentId
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    this.requestId++
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.requestId,
      method,
      params
    }

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status} ${response.statusText}`)
    }

    const data: MCPMessage = await response.json()

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`)
    }

    return data.result
  }

  async initialize(): Promise<void> {
    const result = await this.sendRequest('initialize', {
      clientInfo: {
        name: 'ai-chat-agent',
        version: '1.0.0',
        agentId: this.agentId
      }
    })
    this.sessionId = result.sessionId
  }

  async listTools(): Promise<MCPTool[]> {
    const result = await this.sendRequest('tools/list')
    return result.tools || []
  }

  async callTool(name: string, args: Record<string, any>): Promise<string> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args
    })

    if (result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || JSON.stringify(item))
        .join('\n')
    }

    return result.result || JSON.stringify(result)
  }
}

function convertMCPToolToOpenRouterFunction(mcpTool: MCPTool) {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: {
        type: mcpTool.inputSchema.type,
        properties: mcpTool.inputSchema.properties,
        required: mcpTool.inputSchema.required || []
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const payload: ChatPayload = await req.json()

    if (!payload.agent_id || !payload.phone_number || !payload.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', required: ['agent_id', 'phone_number', 'message'] }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('AI Chat Request:', {
      agent_id: payload.agent_id,
      phone_number: payload.phone_number,
      message_length: payload.message.length,
      user_context: payload.user_context || 'External'
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', payload.agent_id)
      .single()

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    if (agent.status !== 'Active') {
      return new Response(
        JSON.stringify({ error: 'Agent is not active' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')!
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }

    const userContext = payload.user_context || 'External'

    await supabase
      .from('ai_agent_chat_memory')
      .insert({
        agent_id: payload.agent_id,
        phone_number: payload.phone_number,
        role: 'user',
        message: payload.message,
        user_context: userContext,
        action: userContext === 'Internal' ? 'Chat' : 'User Message'
      })

    const { data: chatHistory } = await supabase
      .from('ai_agent_chat_memory')
      .select('role, message')
      .eq('agent_id', payload.agent_id)
      .eq('phone_number', payload.phone_number)
      .order('created_at', { ascending: true })
      .limit(20)

    const conversationMessages = (chatHistory || []).map(msg => ({
      role: msg.role,
      content: msg.message
    }))

    const { data: permissionsData } = await supabase
      .from('ai_agent_permissions')
      .select('permissions')
      .eq('agent_id', payload.agent_id)
      .single()

    const permissions = permissionsData?.permissions || {}

    let tools: any[] = []
    let mcpClient: MCPClient | null = null
    const useMCP = agent.use_mcp && agent.mcp_config?.enabled

    // Track which modules are handled by MCP
    const mcpModules: string[] = []

    if (useMCP) {
      console.log('Using MCP mode for agent:', agent.name)
      try {
        const mcpServerUrl = agent.mcp_config.server_url || `${supabaseUrl}/functions/v1/mcp-server`
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

        mcpClient = new MCPClient(mcpServerUrl, anonKey, payload.agent_id)
        await mcpClient.initialize()

        const mcpTools = await mcpClient.listTools()
        const useForModules = agent.mcp_config.use_for_modules || []

        const filteredTools = mcpTools.filter(tool => {
          if (useForModules.length === 0) return true
          return useForModules.some((module: string) =>
            tool.name.toLowerCase().includes(module.toLowerCase())
          )
        })

        tools = filteredTools.map(convertMCPToolToOpenRouterFunction)
        mcpModules.push(...useForModules)
        console.log(`Loaded ${tools.length} MCP tools for modules: ${mcpModules.join(', ')}`)
      } catch (error) {
        console.error('Failed to initialize MCP client:', error)
        console.log('Falling back to hardcoded tools')
      }
    }

    // Add hardcoded tools for modules NOT using MCP
    console.log('Adding hardcoded tools for non-MCP modules')

    if (permissions['Expenses']?.can_create && !mcpModules.includes('Expenses')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_expense',
          description: 'Create a new expense entry in the CRM',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Expense amount' },
              description: { type: 'string', description: 'Expense description' },
              category: { type: 'string', description: 'Expense category (e.g., Travel, Food, Office)' },
              expense_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
              payment_method: { type: 'string', description: 'Payment method (e.g., Cash, Card, UPI)' },
              team_member_name: { type: 'string', description: 'Name of the team member' }
            },
            required: ['amount', 'description', 'category', 'expense_date']
          }
        }
      })
    }

    if (permissions['Tasks']?.can_create && !mcpModules.includes('Tasks')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task in the CRM',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Task title' },
              description: { type: 'string', description: 'Task description' },
              status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'], description: 'Task status' },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Task priority' },
              due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
              assigned_to_name: { type: 'string', description: 'Name of the person to assign the task to' },
              contact_name: { type: 'string', description: 'Associated contact name' },
              contact_phone: { type: 'string', description: 'Associated contact phone' }
            },
            required: ['title', 'status', 'priority']
          }
        }
      })
    }

    if (permissions['Support Tickets']?.can_create && !mcpModules.includes('Support Tickets')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_support_ticket',
          description: 'Create a new support ticket in the CRM',
          parameters: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'Ticket subject' },
              description: { type: 'string', description: 'Detailed description of the issue' },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Ticket priority' },
              category: { type: 'string', description: 'Ticket category (e.g., General, Technical, Billing)' },
              reporter_name: { type: 'string', description: 'Name of the person reporting the issue' },
              reporter_phone: { type: 'string', description: 'Phone number of the reporter' },
              reporter_email: { type: 'string', description: 'Email of the reporter' }
            },
            required: ['subject', 'description', 'priority']
          }
        }
      })
    }

    if (permissions['Leads']?.can_create && !mcpModules.includes('Leads')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_lead',
          description: 'Create a new lead in the CRM',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Lead name' },
              phone: { type: 'string', description: 'Phone number' },
              email: { type: 'string', description: 'Email address' },
              interest: { type: 'string', description: 'Area of interest' },
              source: { type: 'string', description: 'Lead source (e.g., Website, Referral, Social Media)' },
              stage: { type: 'string', description: 'Lead stage' },
              notes: { type: 'string', description: 'Additional notes' }
            },
            required: ['name', 'phone']
          }
        }
      })
    }

    if (permissions['Appointments']?.can_create && !mcpModules.includes('Appointments')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_appointment',
          description: 'Create a new appointment in the CRM',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title of the appointment' },
              contact_name: { type: 'string', description: 'Name of the contact' },
              contact_phone: { type: 'string', description: 'Phone number of the contact' },
              contact_email: { type: 'string', description: 'Email of the contact' },
              appointment_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
              appointment_time: { type: 'string', description: 'Time in HH:MM format (24-hour)' },
              duration_minutes: { type: 'number', description: 'Duration in minutes' },
              location: { type: 'string', description: 'Location of the appointment' },
              purpose: { type: 'string', description: 'Purpose of the appointment' }
            },
            required: ['title', 'appointment_date', 'appointment_time']
          }
        }
      })
    }

    if (permissions['Support Tickets']?.can_view && !mcpModules.includes('Support Tickets')) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_support_tickets',
          description: 'Get support tickets from the CRM',
          parameters: {
            type: 'object',
            properties: {
              ticket_id: { type: 'string', description: 'Get a specific ticket by its ticket_id (e.g., TKT-2025-061)' },
              status: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'], description: 'Filter by ticket status' },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Filter by priority' },
              limit: { type: 'number', description: 'Number of tickets to retrieve' }
            }
          }
        }
      })
    }

    if (permissions['Tasks']?.can_view && !mcpModules.includes('Tasks')) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_tasks',
          description: 'Get tasks from the CRM',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'Get a specific task by its task_id (e.g., TASK-10031)' },
              status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'], description: 'Filter by task status' },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Filter by priority' },
              limit: { type: 'number', description: 'Number of tasks to retrieve' }
            }
          }
        }
      })
    }

    if (permissions['Leads']?.can_view && !mcpModules.includes('Leads')) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_leads',
          description: 'Get leads from the CRM',
          parameters: {
            type: 'object',
            properties: {
              stage: { type: 'string', description: 'Filter by lead stage' },
              limit: { type: 'number', description: 'Number of leads to retrieve' }
            }
          }
        }
      })
    }

    if (permissions['Appointments']?.can_view && !mcpModules.includes('Appointments')) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_appointments',
          description: 'Get appointments from the CRM',
          parameters: {
            type: 'object',
            properties: {
              date_filter: { type: 'string', enum: ['today', 'upcoming', 'past', 'this_month', 'all'], description: 'Filter by date' },
              appointment_id: { type: 'string', description: 'Specific appointment ID' },
              limit: { type: 'number', description: 'Number of appointments to retrieve' }
            }
          }
        }
      })
    }

    if (permissions['Contacts']?.can_view && !mcpModules.includes('Contacts')) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_contacts',
          description: 'Get contacts from the CRM',
          parameters: {
            type: 'object',
            properties: {
              search: { type: 'string', description: 'Search by name, email, or phone' },
              limit: { type: 'number', description: 'Number of contacts to retrieve' }
            }
          }
        }
      })
    }

    console.log(`Total tools available: ${tools.length}`)

    const enhancedSystemPrompt = `${agent.system_prompt}\n\n**CRITICAL: You MUST use the provided tools to perform actions. NEVER pretend to complete an action without actually calling the tool.**\n\nYou have access to CRM tools. When a user asks you to perform actions like creating expenses, tasks, appointments, or retrieving data:\n\n1. **YOU MUST call the appropriate tool** - Do NOT respond as if you completed the action without calling the tool\n2. Execute actions immediately if you have enough information\n3. DO NOT ask for confirmation or additional details if you have sufficient information\n4. Only ask clarifying questions if critical required information is truly missing\n\nExamples of CORRECT behavior:\n- User: "create a task for tomorrow" → YOU MUST call create_task tool with the details\n- User: "show ticket TKT-2025-061" → YOU MUST call get_support_tickets tool\n- User: "create expense for mumbai flight 2800" → YOU MUST call create_expense tool\n\nExamples of INCORRECT behavior (DO NOT DO THIS):\n- User: "create a task" → Responding "I've created the task" WITHOUT calling create_task tool ❌\n- User: "add expense" → Saying "Expense added" WITHOUT calling create_expense tool ❌\n\n**Remember: If you don't call the tool, the action won't actually happen in the system. Always use tools for actions.**`

    // Detect action keywords in the user's message
    const lastUserMessage = payload.message.toLowerCase()
    const actionKeywords = ['create', 'add', 'make', 'schedule', 'book', 'update', 'delete', 'remove', 'assign']
    const isActionRequest = actionKeywords.some(keyword => lastUserMessage.includes(keyword))

    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...conversationMessages
    ]

    // Add extra enforcement for action requests
    if (isActionRequest && tools.length > 0) {
      messages.push({
        role: 'system',
        content: `IMPORTANT: The user is requesting an action. You MUST use one of the available tools. Do NOT just respond with text. Call the appropriate tool now.`
      })
    }

    const requestBody: any = {
      model: agent.model,
      messages: messages
    }

    if (tools.length > 0) {
      requestBody.tools = tools

      // For action requests, strongly encourage tool use
      // Use 'required' to force tool calling when user explicitly requests an action
      if (isActionRequest) {
        // Try 'required' first, will fall back to 'auto' if model doesn't support it
        requestBody.tool_choice = 'required'
        console.log('Action detected - setting tool_choice to required')
      } else {
        requestBody.tool_choice = 'auto'
      }

      requestBody.parallel_tool_calls = false
    }

    let aiResponse: string

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const assistantMessage = data.choices[0].message

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolResults: string[] = []

        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name
          const functionArgs = JSON.parse(toolCall.function.arguments)

          if (useMCP && mcpClient) {
            console.log(`Executing MCP tool: ${functionName}`)
            try {
              const result = await mcpClient.callTool(functionName, functionArgs)
              toolResults.push(result)
            } catch (error) {
              console.error(`MCP tool execution failed for ${functionName}:`, error)
              toolResults.push(`❌ Failed to execute ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
            continue
          }

          if (functionName === 'create_expense') {
            let teamMemberId = null
            if (functionArgs.team_member_name) {
              const { data: teamMember } = await supabase
                .from('admin_users')
                .select('id')
                .ilike('full_name', `%${functionArgs.team_member_name}%`)
                .single()
              teamMemberId = teamMember?.id
            }

            const { error: expenseError } = await supabase
              .from('expenses')
              .insert({
                amount: functionArgs.amount,
                description: functionArgs.description,
                category: functionArgs.category,
                expense_date: functionArgs.expense_date,
                payment_method: functionArgs.payment_method || 'Cash',
                team_member_id: teamMemberId,
                status: 'Pending'
              })

            if (expenseError) {
              toolResults.push(`❌ Failed to create expense: ${expenseError.message}`)
            } else {
              toolResults.push(`✅ Expense created: ₹${functionArgs.amount} for ${functionArgs.description}`)
            }
          } else if (functionName === 'create_task') {
            let assignedToId = null
            if (functionArgs.assigned_to_name) {
              const { data: teamMember } = await supabase
                .from('admin_users')
                .select('id')
                .ilike('full_name', `%${functionArgs.assigned_to_name}%`)
                .single()
              assignedToId = teamMember?.id
            }

            let contactId = null
            if (functionArgs.contact_phone) {
              const { data: contact } = await supabase
                .from('contacts_master')
                .select('id')
                .eq('phone', functionArgs.contact_phone)
                .single()
              contactId = contact?.id
            }

            const { data: newTask, error: taskError } = await supabase
              .from('tasks')
              .insert({
                title: functionArgs.title,
                description: functionArgs.description,
                status: functionArgs.status || 'To Do',
                priority: functionArgs.priority || 'Medium',
                due_date: functionArgs.due_date,
                assigned_to: assignedToId,
                contact_id: contactId
              })
              .select('task_id, title, status, priority, due_date, assigned_to_name')
              .single()

            if (taskError) {
              toolResults.push(`❌ Failed to create task: ${taskError.message}`)
            } else {
              const assignedToText = newTask.assigned_to_name ? ` assigned to ${newTask.assigned_to_name}` : ''
              const dueDateText = newTask.due_date ? ` due on ${newTask.due_date}` : ''
              toolResults.push(`✅ Task created successfully:\n- ID: ${newTask.task_id}\n- Title: ${newTask.title}\n- Status: ${newTask.status}\n- Priority: ${newTask.priority}${assignedToText}${dueDateText}`)
            }
          } else if (functionName === 'create_support_ticket') {
            let contactId = null
            if (functionArgs.reporter_phone) {
              const { data: contact } = await supabase
                .from('contacts_master')
                .select('id')
                .eq('phone', functionArgs.reporter_phone)
                .maybeSingle()

              if (!contact && functionArgs.reporter_name) {
                const { data: newContact } = await supabase
                  .from('contacts_master')
                  .insert({
                    name: functionArgs.reporter_name,
                    phone: functionArgs.reporter_phone,
                    email: functionArgs.reporter_email
                  })
                  .select('id')
                  .single()
                contactId = newContact?.id
              } else {
                contactId = contact?.id
              }
            }

            const ticketId = `TKT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

            const { error: ticketError } = await supabase
              .from('support_tickets')
              .insert({
                ticket_id: ticketId,
                subject: functionArgs.subject,
                description: functionArgs.description,
                priority: functionArgs.priority,
                category: functionArgs.category || 'General',
                status: 'Open',
                contact_id: contactId,
                reporter_name: functionArgs.reporter_name,
                reporter_phone: functionArgs.reporter_phone,
                reporter_email: functionArgs.reporter_email
              })

            if (ticketError) {
              toolResults.push(`❌ Failed to create ticket: ${ticketError.message}`)
            } else {
              toolResults.push(`✅ Support ticket created: ${ticketId} - ${functionArgs.subject}`)
            }
          } else if (functionName === 'create_lead') {
            const { error: leadError } = await supabase
              .from('leads')
              .insert({
                name: functionArgs.name,
                phone: functionArgs.phone,
                email: functionArgs.email,
                interest: functionArgs.interest,
                source: functionArgs.source,
                stage: functionArgs.stage || 'New',
                notes: functionArgs.notes
              })

            if (leadError) {
              toolResults.push(`❌ Failed to create lead: ${leadError.message}`)
            } else {
              toolResults.push(`✅ Lead created: ${functionArgs.name} (${functionArgs.phone})`)
            }
          } else if (functionName === 'create_appointment') {
            let contactId = null
            if (functionArgs.contact_phone) {
              const { data: contact } = await supabase
                .from('contacts_master')
                .select('id')
                .eq('phone', functionArgs.contact_phone)
                .maybeSingle()

              if (!contact && functionArgs.contact_name) {
                const { data: newContact } = await supabase
                  .from('contacts_master')
                  .insert({
                    name: functionArgs.contact_name,
                    phone: functionArgs.contact_phone,
                    email: functionArgs.contact_email
                  })
                  .select('id')
                  .single()
                contactId = newContact?.id
              } else {
                contactId = contact?.id
              }
            }

            const { error: appointmentError } = await supabase
              .from('appointments')
              .insert({
                title: functionArgs.title,
                contact_id: contactId,
                appointment_date: functionArgs.appointment_date,
                appointment_time: functionArgs.appointment_time,
                duration_minutes: functionArgs.duration_minutes || 30,
                location: functionArgs.location,
                purpose: functionArgs.purpose,
                status: 'Scheduled'
              })

            if (appointmentError) {
              toolResults.push(`❌ Failed to create appointment: ${appointmentError.message}`)
            } else {
              toolResults.push(`✅ Appointment created: ${functionArgs.title} on ${functionArgs.appointment_date} at ${functionArgs.appointment_time}`)
            }
          } else if (functionName === 'get_support_tickets') {
            let ticketsQuery = supabase
              .from('support_tickets')
              .select('*')
              .order('created_at', { ascending: false })

            if (functionArgs.ticket_id) {
              ticketsQuery = ticketsQuery.eq('ticket_id', functionArgs.ticket_id)
            }
            if (functionArgs.status) {
              ticketsQuery = ticketsQuery.eq('status', functionArgs.status)
            }
            if (functionArgs.priority) {
              ticketsQuery = ticketsQuery.eq('priority', functionArgs.priority)
            }

            ticketsQuery = ticketsQuery.limit(functionArgs.limit || 10)

            const { data: tickets, error: ticketsError } = await ticketsQuery

            if (ticketsError) {
              toolResults.push(`❌ Failed to fetch tickets: ${ticketsError.message}`)
            } else if (tickets && tickets.length > 0) {
              const ticketSummary = tickets.map(t =>
                `• ${t.ticket_id}: ${t.subject} [${t.status}] - Priority: ${t.priority}`
              ).join('\n')
              toolResults.push(`✅ Found ${tickets.length} ticket(s):\n${ticketSummary}`)
            } else {
              toolResults.push(`No support tickets found`)
            }
          } else if (functionName === 'get_tasks') {
            let tasksQuery = supabase
              .from('tasks')
              .select('*')
              .order('created_at', { ascending: false })

            if (functionArgs.task_id) {
              tasksQuery = tasksQuery.eq('task_id', functionArgs.task_id)
            }
            if (functionArgs.status) {
              tasksQuery = tasksQuery.eq('status', functionArgs.status)
            }
            if (functionArgs.priority) {
              tasksQuery = tasksQuery.eq('priority', functionArgs.priority)
            }

            tasksQuery = tasksQuery.limit(functionArgs.limit || 10)

            const { data: tasks, error: tasksError } = await tasksQuery

            if (tasksError) {
              toolResults.push(`❌ Failed to fetch tasks: ${tasksError.message}`)
            } else if (tasks && tasks.length > 0) {
              const taskSummary = tasks.map(t =>
                `• ${t.task_id}: ${t.title} [${t.status}] - Priority: ${t.priority}${t.assigned_to_name ? ` - Assigned to: ${t.assigned_to_name}` : ''}`
              ).join('\n')
              toolResults.push(`✅ Found ${tasks.length} task(s):\n${taskSummary}`)
            } else {
              toolResults.push(`No tasks found`)
            }
          } else if (functionName === 'get_leads') {
            let leadsQuery = supabase
              .from('leads')
              .select('*')
              .order('created_at', { ascending: false })

            if (functionArgs.stage) {
              leadsQuery = leadsQuery.eq('stage', functionArgs.stage)
            }

            leadsQuery = leadsQuery.limit(functionArgs.limit || 10)

            const { data: leads, error: leadsError } = await leadsQuery

            if (leadsError) {
              toolResults.push(`❌ Failed to fetch leads: ${leadsError.message}`)
            } else if (leads && leads.length > 0) {
              const leadSummary = leads.map(l =>
                `• ${l.name} (${l.phone}) - ${l.stage}${l.interest ? ` - Interest: ${l.interest}` : ''}`
              ).join('\n')
              toolResults.push(`✅ Found ${leads.length} lead(s):\n${leadSummary}`)
            } else {
              toolResults.push(`No leads found`)
            }
          } else if (functionName === 'get_appointments') {
            let appointmentsQuery = supabase
              .from('appointments')
              .select('*')
              .order('appointment_date', { ascending: true })

            if (functionArgs.appointment_id) {
              appointmentsQuery = appointmentsQuery.eq('appointment_id', functionArgs.appointment_id)
            }

            if (functionArgs.date_filter) {
              const today = new Date().toISOString().split('T')[0]
              switch (functionArgs.date_filter) {
                case 'today':
                  appointmentsQuery = appointmentsQuery.eq('appointment_date', today)
                  break
                case 'upcoming':
                  appointmentsQuery = appointmentsQuery.gte('appointment_date', today)
                  break
                case 'past':
                  appointmentsQuery = appointmentsQuery.lt('appointment_date', today)
                  break
                case 'this_month':
                  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
                  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
                  appointmentsQuery = appointmentsQuery.gte('appointment_date', startOfMonth).lte('appointment_date', endOfMonth)
                  break
              }
            }

            appointmentsQuery = appointmentsQuery.limit(functionArgs.limit || 10)

            const { data: appointments, error: appointmentsError } = await appointmentsQuery

            if (appointmentsError) {
              toolResults.push(`❌ Failed to fetch appointments: ${appointmentsError.message}`)
            } else if (appointments && appointments.length > 0) {
              const appointmentSummary = appointments.map(a =>
                `• ${a.title} - ${a.appointment_date} at ${a.appointment_time} [${a.status}]`
              ).join('\n')
              toolResults.push(`✅ Found ${appointments.length} appointment(s):\n${appointmentSummary}`)
            } else {
              toolResults.push(`No appointments found`)
            }
          } else if (functionName === 'get_contacts') {
            let contactsQuery = supabase
              .from('contacts_master')
              .select('*')
              .order('created_at', { ascending: false })

            if (functionArgs.search) {
              contactsQuery = contactsQuery.or(`name.ilike.%${functionArgs.search}%,email.ilike.%${functionArgs.search}%,phone.ilike.%${functionArgs.search}%`)
            }

            contactsQuery = contactsQuery.limit(functionArgs.limit || 10)

            const { data: contacts, error: contactsError } = await contactsQuery

            if (contactsError) {
              toolResults.push(`❌ Failed to fetch contacts: ${contactsError.message}`)
            } else if (contacts && contacts.length > 0) {
              const contactSummary = contacts.map(c =>
                `• ${c.name} (${c.phone})${c.email ? ` - ${c.email}` : ''}`
              ).join('\n')
              toolResults.push(`✅ Found ${contacts.length} contact(s):\n${contactSummary}`)
            } else {
              toolResults.push(`No contacts found`)
            }
          }
        }

        console.log(`Tool execution completed. Results: ${toolResults.length} items`)

        const finalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: agent.model,
            messages: [
              { role: 'system', content: enhancedSystemPrompt },
              ...conversationMessages,
              { role: 'assistant', content: toolResults.join('\n\n') },
              { role: 'user', content: 'Based on the tool execution results above, provide a natural, conversational response to the user. Keep it concise and friendly.' }
            ]
          }),
        })

        const finalData = await finalResponse.json()
        aiResponse = finalData.choices[0].message.content
      } else {
        aiResponse = assistantMessage.content
      }

    } catch (error: any) {
      console.error('AI Processing Error:', error)
      return new Response(
        JSON.stringify({ error: `AI processing failed: ${error.message}` }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    await supabase
      .from('ai_agent_chat_memory')
      .insert({
        agent_id: payload.agent_id,
        phone_number: payload.phone_number,
        role: 'assistant',
        message: aiResponse,
        user_context: userContext,
        action: userContext === 'Internal' ? 'Chat' : 'AI Response'
      })

    console.log('AI Response generated:', {
      length: aiResponse.length,
      preview: aiResponse.substring(0, 100)
    })

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error: any) {
    console.error('Error in ai-chat function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
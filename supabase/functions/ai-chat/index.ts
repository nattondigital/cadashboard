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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: ChatPayload = await req.json()

    if (!payload.agent_id || !payload.phone_number || !payload.message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['agent_id', 'phone_number', 'message'],
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

    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', payload.agent_id)
      .maybeSingle()

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({
          error: 'AI Agent not found',
          agent_id: payload.agent_id,
        }),
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
        JSON.stringify({
          error: 'AI Agent is not active',
          agent_name: agent.name,
          status: agent.status,
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const { error: userMessageError } = await supabase
      .from('ai_agent_chat_memory')
      .insert({
        agent_id: payload.agent_id,
        phone_number: payload.phone_number,
        message: payload.message,
        role: 'user',
        user_context: 'External',
        action: 'Chat',
        result: 'Success',
        module: 'General',
        metadata: {
          user_context: payload.user_context || null,
          timestamp: new Date().toISOString(),
        },
      })

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError)
      return new Response(
        JSON.stringify({
          error: 'Failed to save user message',
          details: userMessageError.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const { data: chatHistory, error: historyError } = await supabase
      .from('ai_agent_chat_memory')
      .select('*')
      .eq('phone_number', payload.phone_number)
      .order('created_at', { ascending: true })
      .limit(100)

    if (historyError) {
      console.error('Error fetching chat history:', historyError)
    }

    const conversationMessages = chatHistory
      ? chatHistory.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.message
        }))
      : []

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('integration_type', 'openrouter')
      .eq('status', 'Connected')
      .maybeSingle()

    if (integrationError) {
      console.error('Error fetching OpenRouter integration:', integrationError)
    }

    const openRouterApiKey = integration?.config?.apiKey

    if (!openRouterApiKey) {
      const setupResponse = `Hello! I'm ${agent.name}. I'm currently in setup mode. To enable full AI functionality, please configure OpenRouter integration in Settings > Integrations.`

      const { error: assistantMessageError } = await supabase
        .from('ai_agent_chat_memory')
        .insert({
          agent_id: payload.agent_id,
          phone_number: payload.phone_number,
          message: setupResponse,
          role: 'assistant',
          user_context: 'External',
          action: 'Chat',
          result: 'Success',
          module: 'General',
          metadata: {
            model: agent.model,
            timestamp: new Date().toISOString(),
          },
        })

      if (assistantMessageError) {
        console.error('Error saving assistant message:', assistantMessageError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Chat message processed successfully',
          data: {
            agent_name: agent.name,
            agent_model: agent.model,
            user_message: payload.message,
            assistant_response: setupResponse,
            phone_number: payload.phone_number,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const { data: permData } = await supabase
      .from('ai_agent_permissions')
      .select('permissions')
      .eq('agent_id', payload.agent_id)
      .maybeSingle()

    const permissions = permData?.permissions || {}
    const tools: any[] = []

    if (permissions['Expenses']?.can_create) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_expense',
          description: 'Create a new expense entry in the CRM',
          parameters: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Description of the expense' },
              amount: { type: 'number', description: 'Amount of the expense' },
              category: { type: 'string', description: 'Category of the expense (e.g., Marketing, Software, Travel, Food, Transportation). If not specified in the request, infer from the description (e.g., "flight" -> Travel, "lunch" -> Food)' },
              date: { type: 'string', description: 'Date of expense in YYYY-MM-DD format' }
            },
            required: ['description', 'amount']
          }
        }
      })
    }

    if (permissions['Tasks']?.can_create) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task in the CRM',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title of the task' },
              description: { type: 'string', description: 'Detailed description of the task' },
              due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Priority level of the task' }
            },
            required: ['title']
          }
        }
      })
    }

    if (permissions['Leads']?.can_create) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_lead',
          description: 'Create a new lead in the CRM',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the lead' },
              phone: { type: 'string', description: 'Phone number of the lead' },
              email: { type: 'string', description: 'Email address of the lead' },
              company: { type: 'string', description: 'Company name' },
              interest: { type: 'string', enum: ['Hot', 'Warm', 'Cold'], description: 'Interest level of the lead' },
              source: { type: 'string', description: 'Source of the lead (e.g., Website, Referral, Phone)' }
            },
            required: ['name', 'phone']
          }
        }
      })
    }

    if (permissions['Appointments']?.can_create) {
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

    if (permissions['Support Tickets']?.can_view) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_support_tickets',
          description: 'Get support tickets from the CRM. Can search by ticket ID, reporter name, or filter by status.',
          parameters: {
            type: 'object',
            properties: {
              ticket_id: { type: 'string', description: 'Specific ticket ID to retrieve (e.g., TKT-2025-061)' },
              reporter_name: { type: 'string', description: 'Search by reporter/contact name' },
              status: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'], description: 'Filter by ticket status' },
              limit: { type: 'number', description: 'Number of tickets to retrieve (default 10)' }
            }
          }
        }
      })
    }

    if (permissions['Expenses']?.can_view) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_expenses',
          description: 'Get expenses from the CRM with optional filtering',
          parameters: {
            type: 'object',
            properties: {
              date_filter: { type: 'string', description: 'Filter by date: "today", "this_week", "this_month", "last_month"' },
              category: { type: 'string', description: 'Filter by category' },
              limit: { type: 'number', description: 'Number of expenses to retrieve' }
            }
          }
        }
      })
    }

    if (permissions['Tasks']?.can_view) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_tasks',
          description: 'Get tasks from the CRM',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'], description: 'Filter by task status' },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Filter by priority' },
              limit: { type: 'number', description: 'Number of tasks to retrieve' }
            }
          }
        }
      })
    }

    if (permissions['Leads']?.can_view) {
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

    if (permissions['Appointments']?.can_view) {
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

    if (permissions['Contacts']?.can_view) {
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

    const enhancedSystemPrompt = `${agent.system_prompt}\n\nYou have access to CRM tools. When a user asks you to perform actions like creating expenses, tasks, or retrieving data, use the available tools to execute those actions immediately. DO NOT ask for confirmation or additional details if you have enough information to proceed. For example:
- If a user provides a ticket ID like "TKT-2025-061", immediately use get_support_tickets with that ticket_id
- If a user says "create an expense of 2800 for mumbai flight", immediately use create_expense with the provided details
- Only ask clarifying questions if critical required information is truly missing

ALWAYS use tools when appropriate instead of just describing what you would do or asking unnecessary questions.`

    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...conversationMessages
    ]

    const requestBody: any = {
      model: agent.model,
      messages: messages
    }

    if (tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    let aiResponse: string

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': supabaseUrl,
          'X-Title': 'CRM AI Agent'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('OpenRouter API error:', errorData)
        aiResponse = `I apologize, but I encountered an error connecting to my AI service. Please try again later.`
      } else {
        const data = await response.json()
        const message = data.choices[0]?.message

        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolResults: string[] = []

          for (const toolCall of message.tool_calls) {
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)

            if (functionName === 'create_expense') {
              const { error: expenseError } = await supabase
                .from('expenses')
                .insert({
                  description: functionArgs.description,
                  amount: functionArgs.amount,
                  category: functionArgs.category || 'Other',
                  expense_date: functionArgs.date || new Date().toISOString().split('T')[0],
                  status: 'Pending'
                })

              if (expenseError) {
                toolResults.push(`❌ Failed to create expense: ${expenseError.message}`)
              } else {
                toolResults.push(`✅ Expense created: ${functionArgs.description} for ₹${functionArgs.amount} (Category: ${functionArgs.category || 'Other'})`)
              }
            } else if (functionName === 'create_task') {
              const { error: taskError } = await supabase
                .from('tasks')
                .insert({
                  title: functionArgs.title,
                  description: functionArgs.description,
                  due_date: functionArgs.due_date,
                  priority: functionArgs.priority || 'Medium',
                  status: 'Pending'
                })

              if (taskError) {
                toolResults.push(`❌ Failed to create task: ${taskError.message}`)
              } else {
                toolResults.push(`✅ Task created: ${functionArgs.title}`)
              }
            } else if (functionName === 'create_lead') {
              const { data: pipelines, error: pipelineError } = await supabase
                .from('pipelines')
                .select('id, name, is_default')

              if (pipelineError) {
                toolResults.push(`❌ Failed to create lead: ${pipelineError.message}`)
                continue
              }

              const pipelineId = pipelines?.find(p => p.is_default)?.id || pipelines?.[0]?.id

              const { data: stages, error: stageError } = await supabase
                .from('pipeline_stages')
                .select('stage_id')
                .eq('pipeline_id', pipelineId)
                .order('display_order', { ascending: true })
                .limit(1)

              if (stageError) {
                toolResults.push(`❌ Failed to create lead: ${stageError.message}`)
                continue
              }

              const firstStageId = stages?.[0]?.stage_id || 'new_lead'

              const { error: leadError } = await supabase
                .from('leads')
                .insert({
                  name: functionArgs.name,
                  phone: functionArgs.phone,
                  email: functionArgs.email,
                  company: functionArgs.company,
                  pipeline_id: pipelineId,
                  stage: firstStageId,
                  interest: functionArgs.interest || 'Warm',
                  source: functionArgs.source || 'Manual Entry'
                })

              if (leadError) {
                toolResults.push(`❌ Failed to create lead: ${leadError.message}`)
              } else {
                toolResults.push(`✅ Lead created: ${functionArgs.name} (${functionArgs.phone})`)
              }
            } else if (functionName === 'create_appointment') {
              const appointmentId = `APT-${Math.floor(Math.random() * 1000000000)}`
              const { error: appointmentError } = await supabase
                .from('appointments')
                .insert({
                  appointment_id: appointmentId,
                  title: functionArgs.title,
                  contact_name: functionArgs.contact_name,
                  contact_phone: functionArgs.contact_phone,
                  contact_email: functionArgs.contact_email,
                  appointment_date: functionArgs.appointment_date,
                  appointment_time: functionArgs.appointment_time,
                  duration_minutes: functionArgs.duration_minutes || 60,
                  location: functionArgs.location,
                  purpose: functionArgs.purpose,
                  status: 'Scheduled',
                  reminder_sent: false
                })

              if (appointmentError) {
                toolResults.push(`❌ Failed to create appointment: ${appointmentError.message}`)
              } else {
                toolResults.push(`✅ Appointment created: ${functionArgs.title} (${appointmentId})`)
              }
            } else if (functionName === 'get_support_tickets') {
              let ticketsQuery = supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false })

              if (functionArgs.ticket_id) {
                ticketsQuery = ticketsQuery.eq('ticket_id', functionArgs.ticket_id)
              } else if (functionArgs.reporter_name) {
                ticketsQuery = ticketsQuery.ilike('reporter_name', `%${functionArgs.reporter_name}%`)
              }

              if (functionArgs.status) {
                ticketsQuery = ticketsQuery.eq('status', functionArgs.status)
              }

              ticketsQuery = ticketsQuery.limit(functionArgs.limit || 10)

              const { data: tickets, error: ticketsError } = await ticketsQuery

              if (ticketsError) {
                toolResults.push(`❌ Failed to fetch tickets: ${ticketsError.message}`)
              } else if (tickets && tickets.length > 0) {
                const ticketSummary = tickets.map(t =>
                  `• ${t.ticket_id}: ${t.subject} (Status: ${t.status}, Priority: ${t.priority}, Reporter: ${t.reporter_name})`
                ).join('\n')
                toolResults.push(`✅ Found ${tickets.length} ticket(s):\n${ticketSummary}`)
              } else {
                toolResults.push(`No tickets found matching the criteria`)
              }
            } else if (functionName === 'get_expenses') {
              let expensesQuery = supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false })

              if (functionArgs.date_filter) {
                const today = new Date().toISOString().split('T')[0]
                if (functionArgs.date_filter === 'today') {
                  expensesQuery = expensesQuery.eq('expense_date', today)
                }
              }

              if (functionArgs.category) {
                expensesQuery = expensesQuery.eq('category', functionArgs.category)
              }

              expensesQuery = expensesQuery.limit(functionArgs.limit || 10)

              const { data: expenses, error: expensesError } = await expensesQuery

              if (expensesError) {
                toolResults.push(`❌ Failed to fetch expenses: ${expensesError.message}`)
              } else if (expenses && expenses.length > 0) {
                const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
                const expenseSummary = expenses.map(e =>
                  `• ₹${e.amount} - ${e.description} (${e.category}) on ${e.expense_date}`
                ).join('\n')
                toolResults.push(`✅ Found ${expenses.length} expense(s) totaling ₹${total.toFixed(2)}:\n${expenseSummary}`)
              } else {
                toolResults.push(`No expenses found`)
              }
            } else if (functionName === 'get_tasks') {
              let tasksQuery = supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false })

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
                  `• ${t.title} (${t.status}, ${t.priority} priority)${t.due_date ? ` - Due: ${t.due_date}` : ''}`
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
                  `• ${l.name} (${l.phone}) - ${l.interest} interest`
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
              } else if (functionArgs.date_filter === 'today') {
                const today = new Date().toISOString().split('T')[0]
                appointmentsQuery = appointmentsQuery.eq('appointment_date', today)
              } else if (functionArgs.date_filter === 'upcoming') {
                const today = new Date().toISOString().split('T')[0]
                appointmentsQuery = appointmentsQuery.gte('appointment_date', today)
              }

              appointmentsQuery = appointmentsQuery.limit(functionArgs.limit || 10)

              const { data: appointments, error: appointmentsError } = await appointmentsQuery

              if (appointmentsError) {
                toolResults.push(`❌ Failed to fetch appointments: ${appointmentsError.message}`)
              } else if (appointments && appointments.length > 0) {
                const appointmentSummary = appointments.map(a =>
                  `• ${a.title} on ${a.appointment_date} at ${a.appointment_time} (${a.status})`
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

          const finalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': supabaseUrl,
              'X-Title': 'CRM AI Agent'
            },
            body: JSON.stringify({
              model: agent.model,
              messages: [
                { role: 'system', content: enhancedSystemPrompt },
                ...conversationMessages,
                message,
                { role: 'tool', content: toolResults.join('\n') }
              ]
            })
          })

          if (finalResponse.ok) {
            const finalData = await finalResponse.json()
            aiResponse = finalData.choices[0]?.message?.content || toolResults.join('\n')
          } else {
            aiResponse = toolResults.join('\n')
          }
        } else {
          aiResponse = message.content
        }
      }
    } catch (error) {
      console.error('Error calling AI API:', error)
      aiResponse = `I apologize, but I encountered an error processing your message. Please try again.`
    }

    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('ai_agent_chat_memory')
      .insert({
        agent_id: payload.agent_id,
        phone_number: payload.phone_number,
        message: aiResponse,
        role: 'assistant',
        user_context: 'External',
        action: 'Chat',
        result: aiResponse.includes('error') || aiResponse.includes('Error') ? 'Error' : 'Success',
        module: 'General',
        metadata: {
          model: agent.model,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (assistantMessageError) {
      console.error('Error saving assistant message:', assistantMessageError)
      return new Response(
        JSON.stringify({
          error: 'Failed to save assistant message',
          details: assistantMessageError.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const { error: updateActivityError } = await supabase
      .from('ai_agents')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', payload.agent_id)

    if (updateActivityError) {
      console.error('Error updating agent activity:', updateActivityError)
    }

    const { error: logError } = await supabase
      .from('ai_agent_logs')
      .insert({
        agent_id: payload.agent_id,
        agent_name: agent.name,
        module: 'General',
        action: 'Chat',
        result: aiResponse.includes('error') || aiResponse.includes('Error') ? 'Error' : 'Success',
        user_context: 'External - ' + payload.phone_number,
        details: {
          phone_number: payload.phone_number,
          user_message: payload.message,
          agent_response: aiResponse.substring(0, 200),
          response_length: aiResponse.length,
          chat_history_length: chatHistory?.length || 0,
        },
      })

    if (logError) {
      console.error('Error logging chat activity:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Chat message processed successfully',
        data: {
          agent_name: agent.name,
          agent_model: agent.model,
          user_message: payload.message,
          assistant_response: aiResponse,
          phone_number: payload.phone_number,
          message_id: assistantMessage.id,
          timestamp: assistantMessage.created_at,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
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

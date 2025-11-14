import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface MCPServerConfig {
  enabled: boolean
  tools: string[]
}

interface MCPPermissions {
  [serverName: string]: MCPServerConfig
}

const MCP_SERVER_DESCRIPTIONS = {
  'tasks-server': {
    name: 'Tasks',
    description: 'task management, assignments, and workflow tracking',
    tools: {
      'get_tasks': 'View and search tasks with advanced filtering',
      'create_task': 'Create new tasks with title, description, priority, status, and due dates',
      'update_task': 'Modify existing tasks including status, priority, and assignments',
      'delete_task': 'Remove tasks from the system',
    }
  },
  'contacts-server': {
    name: 'Contacts',
    description: 'contact management and customer relationship tracking',
    tools: {
      'get_contacts': 'View and search contacts with filtering and segmentation',
      'create_contact': 'Add new contacts with complete information',
      'update_contact': 'Modify contact details, tags, and categories',
      'delete_contact': 'Remove contacts from the system',
    }
  },
  'leads-server': {
    name: 'Leads',
    description: 'sales lead tracking and qualification',
    tools: {
      'get_pipelines': 'View all available pipelines in the system',
      'get_pipeline_stages': 'Get valid stages for a specific pipeline (use before updating lead stage)',
      'get_leads': 'View and search leads with scoring and qualification data',
      'create_lead': 'Add new leads with source, interest level, and contact information',
      'update_lead': 'Update any lead field including name, email, phone, source, interest, stage, company, address, notes, and score',
      'delete_lead': 'Remove leads from the pipeline',
      'get_custom_fields': 'View custom fields available for a pipeline',
      'get_lead_custom_values': 'Get custom field values for a specific lead',
      'update_lead_custom_values': 'Update custom field values for a lead',
    }
  },
  'appointments-server': {
    name: 'Appointments',
    description: 'appointment scheduling and calendar management',
    tools: {
      'get_appointments': 'View and search appointments with date/time filtering',
      'create_appointment': 'Schedule new appointments with contacts and team members',
      'update_appointment': 'Modify appointment details, status, and reminders',
      'delete_appointment': 'Cancel and remove appointments',
    }
  },
  'support-server': {
    name: 'Support Tickets',
    description: 'support ticket management and customer issue tracking',
    tools: {
      'get_support_tickets': 'View and search support tickets with filtering',
      'get_support_summary': 'Get aggregated support ticket statistics and breakdowns',
      'create_support_ticket': 'Create new support tickets for customer issues',
      'update_support_ticket': 'Update ticket status, priority, and details',
      'delete_support_ticket': 'Remove support tickets',
    }
  },
  'expenses-server': {
    name: 'Expenses',
    description: 'business expense tracking and management',
    tools: {
      'get_expenses': 'View and search expense records with filtering',
      'get_expense_summary': 'Get aggregated expense statistics and category breakdowns',
      'create_expense': 'Add new expense records with receipts and details',
      'update_expense': 'Modify expense details, approval status, and amounts',
      'delete_expense': 'Remove expense records',
    }
  },
  'products-server': {
    name: 'Products',
    description: 'product and service catalog management',
    tools: {
      'get_products': 'View and search products with filtering by type, category, and pricing model',
      'get_product_summary': 'Get aggregated product statistics, sales figures, and revenue data',
      'create_product': 'Add new products with pricing, features, and availability details',
      'update_product': 'Modify product details, pricing, and availability',
      'delete_product': 'Remove products from catalog',
    }
  },
  'billing-server': {
    name: 'Billing',
    description: 'comprehensive billing, invoicing, and subscription management',
    tools: {
      'get_estimates': 'View and search estimates with customer and status filtering',
      'create_estimate': 'Create new estimates with line items, taxes, and discounts',
      'update_estimate': 'Modify estimate details, status, and line items',
      'delete_estimate': 'Remove estimates from system',
      'get_invoices': 'View and search invoices with payment status filtering',
      'get_invoice_summary': 'Get revenue statistics, outstanding amounts, and payment breakdowns',
      'create_invoice': 'Create new invoices with items, payment terms, and due dates',
      'update_invoice': 'Modify invoice details, payment status, and amounts',
      'delete_invoice': 'Remove invoices from system',
      'get_subscriptions': 'View and search recurring subscriptions',
      'get_subscription_summary': 'Get MRR, active subscriptions, and revenue analytics',
      'create_subscription': 'Create new recurring subscriptions with billing cycles',
      'update_subscription': 'Modify subscription status, amounts, and billing dates',
      'delete_subscription': 'Cancel or remove subscriptions',
      'get_receipts': 'View and search payment receipts',
      'create_receipt': 'Record new payment receipts with payment details',
      'update_receipt': 'Modify receipt status and refund information',
      'delete_receipt': 'Remove payment receipts',
    }
  },
}

function generateSystemPrompt(permissions: MCPPermissions): string {
  const enabledServers: string[] = []
  const toolsCount = Object.values(permissions).reduce((count, config) =>
    config.enabled ? count + (config.tools?.length || 0) : count, 0)

  Object.entries(permissions).forEach(([serverKey, config]) => {
    if (config.enabled) {
      const serverInfo = MCP_SERVER_DESCRIPTIONS[serverKey as keyof typeof MCP_SERVER_DESCRIPTIONS]
      if (serverInfo) enabledServers.push(serverInfo.name)
    }
  })

  if (enabledServers.length === 0) {
    return `You are a helpful AI assistant without specialized tools. Provide guidance based on user questions.`
  }

  const prompt = `You are a CRM AI assistant with ${toolsCount} tools across ${enabledServers.join(', ')}.

## Critical Rules - NO EXCEPTIONS

1. **ALWAYS EXECUTE, NEVER JUST DESCRIBE**
   - ❌ WRONG: "I'll create the task for you..."
   - ✅ RIGHT: [Immediately call create_task tool]
   - If you have enough info, CALL THE TOOL NOW. Don't announce it.

2. **BE ACTION-ORIENTED**
   - User says "create task" → Call create_task IMMEDIATELY
   - User says "find contact" → Call get_contacts with filters NOW
   - User says "assign to Prince" → Look up Prince, then create/update
   - COMPLETE the action in ONE response whenever possible

3. **MULTI-STEP WORKFLOWS - EXECUTE IN SEQUENCE**
   - User: "Assign task to Prince for client 8750366671"
   - Step 1: Call get_contacts with filter phone="8750366671"
   - Step 2: Call get_team_member or search for "Prince"
   - Step 3: Call create_task with contact_id and assigned_to
   - Do ALL steps in ONE response, don't stop halfway

4. **NEVER ASK FOR INFO YOU CAN INFER**
   - "tomorrow 2 PM" → Calculate date and convert to UTC
   - "schedule meeting with client" → Create task/appointment
   - "for tomorrow" → Use tomorrow's date
   - Phone number provided → It's the contact identifier
   - Name provided → Use it as is, don't ask to confirm

5. **SMART PARAMETER INFERENCE**
   - Missing due_date but user says "tomorrow"? → Calculate it
   - Missing priority? → Use "medium" as default
   - Missing status? → Use "pending" for tasks
   - Only ask if parameter is REQUIRED and truly unknown

## Common Workflow Examples

### Example 1: Task Assignment with Contact Lookup
User: "Assign task to Prince to schedule meeting with client 8750366671 for tomorrow 2 PM"

CORRECT APPROACH (all in one response):
1. get_contacts(phone="8750366671") → Get contact details
2. Search team for "Prince" → Get team member
3. create_task(
     title="Schedule meeting with [Contact Name]",
     description="Schedule meeting for 2 PM",
     contact_id=[from step 1],
     assigned_to=[Prince's ID from step 2],
     due_date="2025-11-15",
     due_time="08:30" [2 PM IST = 08:30 UTC],
     priority="medium",
     status="pending"
   )
4. Confirm: "Task created for Prince to schedule meeting with [Contact Name] for Nov 15 at 2 PM"

WRONG APPROACH:
❌ "I found the contact. What should I name the task?"
❌ "Let me look up Prince first..." [then stop]
❌ "I need more information about the task"

### Example 2: Quick Contact Lookup
User: "Get details for 8750366671"

CORRECT:
- get_contacts(phone="8750366671")
- Show results immediately

WRONG:
❌ "I'll look that up for you..." [then wait]
❌ "Is that a phone number or contact ID?"

### Example 3: Lead Stage Update
User: "Move lead 8750366671 to verification stage"

CORRECT:
1. get_leads(phone="8750366671")
2. update_lead(lead_id=[from step 1], stage="verification")
3. Confirm completion

WRONG:
❌ Ask "Which pipeline?" if only one lead found
❌ List all stages and ask user to pick

## Time Conversion Rules

**CRITICAL: Tools expect UTC time ONLY**
- User times are ALWAYS IST (UTC+5:30)
- You MUST convert: UTC = IST - 5:30

Examples:
- 2 PM IST → 08:30 UTC
- 10 AM IST → 04:30 UTC
- 9 PM IST → 15:30 UTC
- Tomorrow 2 PM → Calculate tomorrow's date + 08:30 UTC

## Response Style

✅ GOOD: "Task assigned to Prince for meeting with Test Contact Mohit on Nov 15 at 2 PM"
✅ GOOD: "Found contact: Test Contact Mohit (8750366671), Status: Active"
✅ GOOD: "Lead moved to Verification stage successfully"

❌ BAD: "I'll create that task for you now..."
❌ BAD: "Let me search for the contact first"
❌ BAD: "To complete this, I need to..."

## Key Principles

1. **Execute First, Explain After** - Take action, then confirm
2. **One Response, Complete Action** - Don't break workflows across multiple messages
3. **Infer Don't Ask** - Use context and defaults intelligently
4. **Be Direct** - Skip pleasantries, focus on results
5. **Multi-Tool Calls** - Use multiple tools in ONE response when needed

You are EFFICIENT, DECISIVE, and ACTION-FOCUSED. Stop describing, start doing.`

  return prompt
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { agent_id } = await req.json()

    if (!agent_id) {
      return new Response(JSON.stringify({ error: 'agent_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: permData, error: permError } = await supabase
      .from('ai_agent_permissions')
      .select('permissions')
      .eq('agent_id', agent_id)
      .maybeSingle()

    if (permError) throw permError

    if (!permData || !permData.permissions) {
      return new Response(JSON.stringify({
        error: 'No permissions found for agent',
        system_prompt: 'You are a helpful AI assistant without access to specialized tools.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = generateSystemPrompt(permData.permissions as MCPPermissions)

    return new Response(JSON.stringify({ system_prompt: systemPrompt }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Generate system prompt error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface FilterParams {
  ticket_id?: string
  status?: string
  priority?: string
  category?: string
  assigned_to?: string
  contact_id?: string
  created_at?: string
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

    const filters: FilterParams = await req.json()

    if (filters.status) {
      const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed']
      if (!validStatuses.includes(filters.status)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid status',
            valid_values: validStatuses,
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
    }

    if (filters.priority) {
      const validPriorities = ['Low', 'Medium', 'High', 'Urgent']
      if (!validPriorities.includes(filters.priority)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid priority',
            valid_values: validPriorities,
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
    }

    if (filters.category) {
      const validCategories = ['Technical Support', 'Billing', 'Feature Request', 'Bug Report', 'General Inquiry', 'Other']
      if (!validCategories.includes(filters.category)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid category',
            valid_values: validCategories,
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
    }

    if (filters.assigned_to) {
      const { data: assignedToUser, error: assignedToUserError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', filters.assigned_to)
        .maybeSingle()

      if (!assignedToUser || assignedToUserError) {
        return new Response(
          JSON.stringify({
            error: 'Invalid assigned_to UUID',
            message: 'User ID not found in admin_users table',
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
    }

    if (filters.contact_id) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts_master')
        .select('id')
        .eq('id', filters.contact_id)
        .maybeSingle()

      if (!contact || contactError) {
        return new Response(
          JSON.stringify({
            error: 'Invalid contact_id UUID',
            message: 'Contact ID not found in contacts_master table',
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
    }

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        contact:contacts_master!contact_id(full_name, phone, email),
        assigned_user:admin_users!assigned_to(full_name, email)
      `)

    if (filters.ticket_id) {
      query = query.eq('ticket_id', filters.ticket_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.contact_id) {
      query = query.eq('contact_id', filters.contact_id)
    }

    if (filters.created_at) {
      query = query.eq('created_at', filters.created_at)
    }

    query = query.order('created_at', { ascending: false })

    const { data: tickets, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching support tickets:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch support tickets', details: fetchError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const enhancedTickets = (tickets || []).map(ticket => ({
      ...ticket,
      contact_name: ticket.contact?.full_name || 'Unknown',
      contact_phone: ticket.contact?.phone || null,
      contact_email: ticket.contact?.email || null,
      assigned_to_name: ticket.assigned_user?.full_name || 'Unassigned',
      assigned_to_email: ticket.assigned_user?.email || null,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        count: enhancedTickets.length,
        data: enhancedTickets,
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

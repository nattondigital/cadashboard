import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface FilterParams {
  recurrence_task_id?: string
  recurrence_type?: string
  assigned_to?: string
  contact_id?: string
  is_active?: boolean
  priority?: string
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

    if (filters.recurrence_type) {
      const validRecurrenceTypes = ['daily', 'weekly', 'monthly']
      if (!validRecurrenceTypes.includes(filters.recurrence_type)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid recurrence_type',
            valid_values: validRecurrenceTypes,
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
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(filters.priority.toLowerCase())) {
        return new Response(
          JSON.stringify({
            error: 'Invalid priority',
            valid_values: ['Low', 'Medium', 'High', 'Urgent'],
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
      .from('recurring_tasks')
      .select('*')

    if (filters.recurrence_task_id) {
      query = query.eq('recurrence_task_id', filters.recurrence_task_id)
    }

    if (filters.recurrence_type) {
      query = query.eq('recurrence_type', filters.recurrence_type)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.contact_id) {
      query = query.eq('contact_id', filters.contact_id)
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority.toLowerCase())
    }

    query = query.order('created_at', { ascending: false })

    const { data: recurringTasks, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recurring tasks', details: fetchError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: recurringTasks?.length || 0,
        data: recurringTasks || [],
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

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface RecurringTaskPayload {
  title: string
  description?: string
  contact_id?: string
  assigned_to?: string
  priority?: string
  recurrence_type: 'daily' | 'weekly' | 'monthly'
  start_time: string
  start_days?: string[]
  start_day_of_month?: number
  due_time: string
  due_days?: string[]
  due_day_of_month?: number
  supporting_docs?: string[]
  category?: string
  is_active?: boolean
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

    const payload: RecurringTaskPayload = await req.json()

    if (!payload.title || !payload.recurrence_type || !payload.start_time || !payload.due_time) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['title', 'recurrence_type', 'start_time', 'due_time'],
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

    const validRecurrenceTypes = ['daily', 'weekly', 'monthly']
    if (!validRecurrenceTypes.includes(payload.recurrence_type)) {
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

    if (payload.recurrence_type === 'weekly') {
      if (!payload.start_days || payload.start_days.length !== 1) {
        return new Response(
          JSON.stringify({
            error: 'Invalid start_days for weekly recurrence',
            message: 'Exactly one day must be provided for weekly recurrence',
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

      if (!payload.due_days || payload.due_days.length !== 1) {
        return new Response(
          JSON.stringify({
            error: 'Invalid due_days for weekly recurrence',
            message: 'Exactly one day must be provided for weekly recurrence',
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

      const validDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      if (!validDays.includes(payload.start_days[0]) || !validDays.includes(payload.due_days[0])) {
        return new Response(
          JSON.stringify({
            error: 'Invalid day values',
            valid_values: validDays,
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

    if (payload.recurrence_type === 'monthly') {
      if (payload.start_day_of_month === undefined || payload.due_day_of_month === undefined) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields for monthly recurrence',
            required: ['start_day_of_month', 'due_day_of_month'],
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

      if (payload.start_day_of_month < 0 || payload.start_day_of_month > 31) {
        return new Response(
          JSON.stringify({
            error: 'Invalid start_day_of_month',
            message: 'Must be between 0 (last day) and 31',
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

      if (payload.due_day_of_month < 0 || payload.due_day_of_month > 31) {
        return new Response(
          JSON.stringify({
            error: 'Invalid due_day_of_month',
            message: 'Must be between 0 (last day) and 31',
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

    if (payload.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(payload.priority.toLowerCase())) {
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

    if (payload.assigned_to) {
      const { data: assignedUser, error: assignedUserError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', payload.assigned_to)
        .maybeSingle()

      if (!assignedUser || assignedUserError) {
        return new Response(
          JSON.stringify({
            error: 'Invalid assigned_to',
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

    if (payload.contact_id) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts_master')
        .select('id')
        .eq('id', payload.contact_id)
        .maybeSingle()

      if (!contact || contactError) {
        return new Response(
          JSON.stringify({
            error: 'Invalid contact_id',
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

    const insertData: any = {
      title: payload.title,
      description: payload.description || null,
      contact_id: payload.contact_id || null,
      assigned_to: payload.assigned_to || null,
      priority: payload.priority ? payload.priority.toLowerCase() : 'medium',
      recurrence_type: payload.recurrence_type,
      start_time: payload.start_time,
      start_days: payload.recurrence_type === 'weekly' ? payload.start_days : null,
      start_day_of_month: payload.recurrence_type === 'monthly' ? payload.start_day_of_month : null,
      due_time: payload.due_time,
      due_days: payload.recurrence_type === 'weekly' ? payload.due_days : null,
      due_day_of_month: payload.recurrence_type === 'monthly' ? payload.due_day_of_month : null,
      supporting_docs: payload.supporting_docs || [],
      category: payload.category || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    }

    const { data: newRecurringTask, error: insertError } = await supabase
      .from('recurring_tasks')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting recurring task:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create recurring task', details: insertError.message }),
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
        message: 'Recurring task created successfully',
        data: newRecurringTask,
      }),
      {
        status: 201,
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

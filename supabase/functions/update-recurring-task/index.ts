import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface UpdateRecurringTaskPayload {
  recurrence_task_id: string
  title?: string
  description?: string
  contact_id?: string
  assigned_to?: string
  priority?: string
  recurrence_type?: 'daily' | 'weekly' | 'monthly'
  start_time?: string
  start_days?: string[]
  start_day_of_month?: number
  due_time?: string
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

    const payload: UpdateRecurringTaskPayload = await req.json()

    if (!payload.recurrence_task_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field',
          required: ['recurrence_task_id'],
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

    const { data: existingTask, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('recurrence_task_id', payload.recurrence_task_id)
      .maybeSingle()

    if (!existingTask || fetchError) {
      return new Response(
        JSON.stringify({
          error: 'Recurring task not found',
          recurrence_task_id: payload.recurrence_task_id,
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

    if (payload.recurrence_type) {
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
    }

    const recurrenceType = payload.recurrence_type || existingTask.recurrence_type

    if (recurrenceType === 'weekly') {
      if (payload.start_days && payload.start_days.length !== 1) {
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

      if (payload.due_days && payload.due_days.length !== 1) {
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

      if (payload.start_days || payload.due_days) {
        const validDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        if (payload.start_days && !validDays.includes(payload.start_days[0])) {
          return new Response(
            JSON.stringify({
              error: 'Invalid start_days values',
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
        if (payload.due_days && !validDays.includes(payload.due_days[0])) {
          return new Response(
            JSON.stringify({
              error: 'Invalid due_days values',
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
    }

    if (recurrenceType === 'monthly') {
      if (payload.start_day_of_month !== undefined) {
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
      }

      if (payload.due_day_of_month !== undefined) {
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

    const updateData: any = {}

    if (payload.title !== undefined) updateData.title = payload.title
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.contact_id !== undefined) updateData.contact_id = payload.contact_id
    if (payload.assigned_to !== undefined) updateData.assigned_to = payload.assigned_to
    if (payload.priority !== undefined) updateData.priority = payload.priority.toLowerCase()
    if (payload.recurrence_type !== undefined) updateData.recurrence_type = payload.recurrence_type
    if (payload.start_time !== undefined) updateData.start_time = payload.start_time
    if (payload.start_days !== undefined) updateData.start_days = payload.start_days
    if (payload.start_day_of_month !== undefined) updateData.start_day_of_month = payload.start_day_of_month
    if (payload.due_time !== undefined) updateData.due_time = payload.due_time
    if (payload.due_days !== undefined) updateData.due_days = payload.due_days
    if (payload.due_day_of_month !== undefined) updateData.due_day_of_month = payload.due_day_of_month
    if (payload.supporting_docs !== undefined) updateData.supporting_docs = payload.supporting_docs
    if (payload.category !== undefined) updateData.category = payload.category
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No fields to update',
          message: 'At least one field must be provided for update',
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

    const { data: updatedTask, error: updateError } = await supabase
      .from('recurring_tasks')
      .update(updateData)
      .eq('recurrence_task_id', payload.recurrence_task_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating recurring task:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update recurring task', details: updateError.message }),
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
        message: 'Recurring task updated successfully',
        data: updatedTask,
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

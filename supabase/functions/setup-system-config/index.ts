import { createClient } from 'npm:@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if config already exists
    const { data: existingConfig, error: checkError } = await supabase
      .from('system_config')
      .select('id, supabase_url')
      .maybeSingle()

    if (checkError) {
      throw new Error(`Failed to check config: ${checkError.message}`)
    }

    if (existingConfig) {
      // Update existing config
      const { error: updateError } = await supabase
        .from('system_config')
        .update({
          supabase_url: supabaseUrl,
          service_role_key: supabaseServiceKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)

      if (updateError) {
        throw new Error(`Failed to update config: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'System configuration updated successfully',
          config_id: existingConfig.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Insert new config
      const { data: newConfig, error: insertError } = await supabase
        .from('system_config')
        .insert({
          supabase_url: supabaseUrl,
          service_role_key: supabaseServiceKey
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to insert config: ${insertError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'System configuration created successfully',
          config_id: newConfig.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
      )
    }
  } catch (error) {
    console.error('Setup config error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

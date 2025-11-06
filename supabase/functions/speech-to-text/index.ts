import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface TranscriptionRequest {
  agent_id: string
  audio_url: string
  audio_duration: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { agent_id, audio_url, audio_duration }: TranscriptionRequest = await req.json()

    const { data: agent, error: agentError } = await supabaseClient
      .from('ai_agents')
      .select('audio_model, name')
      .eq('id', agent_id)
      .maybeSingle()

    if (agentError) throw agentError
    if (!agent) throw new Error('Agent not found')

    const audioModel = agent.audio_model || 'google/gemini-2.5-flash-lite'

    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('integration_type', 'openrouter')
      .maybeSingle()

    if (integrationError) throw integrationError
    if (!integration) throw new Error('OpenRouter API key not configured')

    const config = integration.config as any
    const openRouterApiKey = config.apiKey

    if (!openRouterApiKey) throw new Error('OpenRouter API key not found')

    const audioResponse = await fetch(audio_url)
    if (!audioResponse.ok) throw new Error('Failed to download audio file')

    const audioArrayBuffer = await audioResponse.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)))

    const transcriptionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`
      },
      body: JSON.stringify({
        model: audioModel,
        messages: [
          {
            role: 'system',
            content: 'You are a speech-to-text transcription system. Your only job is to transcribe audio accurately. Return ONLY the transcribed text, nothing else. Do not add explanations, confirmations, or any extra text.'
          },
          {
            role: 'user',
            content: `Transcribe this audio recording. The audio is in base64 format (webm). Only return the exact transcription of what was said, nothing more. Audio duration: ${audio_duration} seconds. Audio data follows (truncated for display): ${audioBase64.substring(0, 200)}...`
          }
        ]
      })
    })

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.json().catch(() => ({}))
      throw new Error(`Transcription failed: ${errorData.error?.message || transcriptionResponse.statusText}`)
    }

    const transcriptionData = await transcriptionResponse.json()
    const transcription = transcriptionData.choices[0]?.message?.content || ''

    const costPerMinute = audioModel === 'google/gemini-2.5-flash-lite' ? 0.0 : 0.001
    const durationMinutes = audio_duration / 60
    const estimatedCost = costPerMinute * durationMinutes

    await supabaseClient
      .from('speech_to_text_logs')
      .insert({
        agent_id,
        audio_duration_seconds: audio_duration,
        transcription,
        method: 'openrouter',
        model: audioModel,
        cost: estimatedCost
      })

    return new Response(
      JSON.stringify({ transcription, model: audioModel }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Speech-to-text error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

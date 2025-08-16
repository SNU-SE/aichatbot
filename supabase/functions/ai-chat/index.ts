import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 성능 최적화를 위한 캐시 설정
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

// 캐시 헬퍼 함수
function getCachedResponse(key: string) {
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  responseCache.delete(key)
  return null
}

function setCachedResponse(key: string, data: any, ttl: number = CACHE_TTL) {
  responseCache.set(key, { data, timestamp: Date.now(), ttl })
}

// 메모리 정리 (주기적으로 실행)
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      responseCache.delete(key)
    }
  }
}, 10 * 60 * 1000) // 10분마다 정리

interface ChatRequest {
  message: string;
  studentId: string;
  activityId?: string;
  useRag?: boolean;
  stream?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get request body
    const { message, studentId, activityId, useRag = false, stream = false }: ChatRequest = await req.json()

    // Validate input
    if (!message || !studentId) {
      return new Response(
        JSON.stringify({ error: 'Message and studentId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get student information
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('name, class_name')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: 'Student not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get activity information if provided
    let activity = null
    if (activityId) {
      const { data: activityData } = await supabaseClient
        .from('activities')
        .select('title, type')
        .eq('id', activityId)
        .single()
      
      activity = activityData
    }

    // Get AI settings for the class and activity type
    let aiSettings = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      promptTemplate: '당신은 학생들을 도와주는 AI 교육 도우미입니다. 학생이 스스로 생각할 수 있도록 안내하고, 직접적인 답보다는 힌트와 질문을 통해 학습을 도와주세요.'
    }

    if (activity && student.class_name) {
      const { data: classSettings } = await supabaseClient
        .from('class_prompt_settings')
        .select('*')
        .eq('class_name', student.class_name)
        .eq('activity_type', activity.type)
        .single()

      if (classSettings) {
        aiSettings = {
          model: classSettings.ai_model || 'gpt-3.5-turbo',
          temperature: classSettings.temperature || 0.7,
          maxTokens: classSettings.max_tokens || 1000,
          promptTemplate: classSettings.prompt_template
        }
      }
    }

    // Get recent chat history for context
    const { data: recentChats } = await supabaseClient
      .from('chat_logs')
      .select('message, response')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5)

    // RAG context if enabled
    let ragContext = ''
    if (useRag) {
      try {
        // Generate embedding for the message
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: message,
          }),
        })

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          const queryEmbedding = embeddingData.data[0]?.embedding

          if (queryEmbedding) {
            const { data: ragResults } = await supabaseClient.rpc('search_document_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: 3
            })

            if (ragResults && ragResults.length > 0) {
              ragContext = '\n\n참고 자료:\n' + 
                ragResults.map((chunk: any) => `- ${chunk.content}`).join('\n')
            }
          }
        }
      } catch (ragError) {
        console.error('RAG search error:', ragError)
        // Continue without RAG if there's an error
      }
    }

    // Build conversation history
    const conversationHistory = []
    if (recentChats && recentChats.length > 0) {
      // Add recent messages in reverse order (oldest first)
      recentChats.reverse().forEach(chat => {
        conversationHistory.push({ role: 'user', content: chat.message })
        conversationHistory.push({ role: 'assistant', content: chat.response })
      })
    }

    // Build the system prompt
    const systemPrompt = aiSettings.promptTemplate
      .replace('{student_name}', student.name)
      .replace('{activity_title}', activity?.title || '일반 학습')
      .replace('{question}', message) + ragContext

    // Prepare messages for API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep last 4 exchanges
      { role: 'user', content: message }
    ]

    // Determine which AI service to use
    const useOpenAI = aiSettings.model.startsWith('gpt')
    const useClaude = aiSettings.model.startsWith('claude')

    let aiResponse = ''
    let tokensUsed = 0

    if (useOpenAI) {
      // Call OpenAI API
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiSettings.model,
          messages: messages,
          temperature: aiSettings.temperature,
          max_tokens: aiSettings.maxTokens,
          stream: stream
        }),
      })

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`)
      }

      if (stream) {
        // Handle streaming response
        return new Response(openaiResponse.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      } else {
        const openaiData = await openaiResponse.json()
        aiResponse = openaiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
        tokensUsed = openaiData.usage?.total_tokens || 0
      }
    } else if (useClaude) {
      // Call Anthropic Claude API
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('ANTHROPIC_API_KEY')}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: aiSettings.model,
          max_tokens: aiSettings.maxTokens,
          temperature: aiSettings.temperature,
          messages: messages.filter(m => m.role !== 'system'),
          system: systemPrompt,
        }),
      })

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text()
        throw new Error(`Claude API error: ${claudeResponse.status} ${errorText}`)
      }

      const claudeData = await claudeResponse.json()
      aiResponse = claudeData.content[0]?.text || 'Sorry, I could not generate a response.'
      tokensUsed = claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0
    } else {
      throw new Error(`Unsupported AI model: ${aiSettings.model}`)
    }

    // Log the chat interaction
    const { error: logError } = await supabaseClient
      .from('chat_logs')
      .insert({
        student_id: studentId,
        message: message,
        response: aiResponse,
        activity_id: activityId,
        tokens_used: tokensUsed,
        model_used: aiSettings.model
      })

    if (logError) {
      console.error('Error logging chat:', logError)
    }

    // Track question frequency
    try {
      await supabaseClient.rpc('track_question_frequency', {
        p_student_id: studentId,
        p_question_text: message.substring(0, 100) // Limit length
      })
    } catch (freqError) {
      console.error('Error tracking question frequency:', freqError)
    }

    // Update student session
    try {
      await supabaseClient
        .from('student_sessions')
        .upsert({
          student_id: studentId,
          last_activity: new Date().toISOString(),
          is_active: true,
        })
    } catch (sessionError) {
      console.error('Error updating student session:', sessionError)
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        tokensUsed: tokensUsed,
        model: aiSettings.model,
        ragUsed: useRag && ragContext.length > 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in ai-chat function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', isAdmin: false }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error checking user role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error checking permissions', isAdmin: false }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const isAdmin = userRole?.role === 'admin'

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required', isAdmin: false }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get additional admin info
    const { data: adminStats } = await supabaseClient
      .from('students')
      .select('id')

    const { data: activityStats } = await supabaseClient
      .from('activities')
      .select('id, is_active')

    const { data: chatStats } = await supabaseClient
      .from('chat_logs')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    return new Response(
      JSON.stringify({ 
        isAdmin: true,
        user: {
          id: user.id,
          email: user.email
        },
        stats: {
          totalStudents: adminStats?.length || 0,
          totalActivities: activityStats?.length || 0,
          activeActivities: activityStats?.filter(a => a.is_active).length || 0,
          chatMessagesToday: chatStats?.length || 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in verify-admin function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', isAdmin: false }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
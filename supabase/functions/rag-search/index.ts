import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RagSearchRequest {
  query: string;
  matchThreshold?: number;
  matchCount?: number;
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

    const { 
      query, 
      matchThreshold = 0.78, 
      matchCount = 5 
    }: RagSearchRequest = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding')
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0]?.embedding

    if (!queryEmbedding) {
      throw new Error('No embedding generated for query')
    }

    // Search for similar document chunks using vector similarity
    const { data: vectorResults, error: vectorError } = await supabaseClient
      .rpc('search_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      })

    if (vectorError) {
      console.error('Vector search error:', vectorError)
    }

    // Also perform keyword-based search as fallback
    const { data: keywordResults, error: keywordError } = await supabaseClient
      .from('document_chunks')
      .select('id, document_name, content')
      .ilike('content', `%${query}%`)
      .limit(matchCount)

    if (keywordError) {
      console.error('Keyword search error:', keywordError)
    }

    // Combine and deduplicate results
    const combinedResults = []
    const seenIds = new Set()

    // Add vector search results first (higher priority)
    if (vectorResults) {
      for (const result of vectorResults) {
        if (!seenIds.has(result.id)) {
          combinedResults.push({
            ...result,
            searchType: 'vector',
            score: result.similarity
          })
          seenIds.add(result.id)
        }
      }
    }

    // Add keyword search results
    if (keywordResults) {
      for (const result of keywordResults) {
        if (!seenIds.has(result.id) && combinedResults.length < matchCount) {
          combinedResults.push({
            ...result,
            searchType: 'keyword',
            score: 0.5 // Default score for keyword matches
          })
          seenIds.add(result.id)
        }
      }
    }

    // Sort by score (descending)
    combinedResults.sort((a, b) => b.score - a.score)

    // Limit to requested count
    const finalResults = combinedResults.slice(0, matchCount)

    return new Response(
      JSON.stringify({ 
        results: finalResults,
        query: query,
        totalFound: finalResults.length,
        searchTypes: {
          vector: finalResults.filter(r => r.searchType === 'vector').length,
          keyword: finalResults.filter(r => r.searchType === 'keyword').length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in rag-search function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
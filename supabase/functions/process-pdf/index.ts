import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessPdfRequest {
  fileUrl: string;
  fileName: string;
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

    const { fileUrl, fileName }: ProcessPdfRequest = await req.json()

    if (!fileUrl || !fileName) {
      return new Response(
        JSON.stringify({ error: 'File URL and name are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Download the PDF file
    const pdfResponse = await fetch(fileUrl)
    if (!pdfResponse.ok) {
      throw new Error('Failed to download PDF')
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    
    // For now, we'll use a simple text extraction approach
    // In a production environment, you'd want to use a proper PDF parsing library
    // like pdf-parse or similar
    
    // Placeholder for PDF text extraction
    // This would need to be replaced with actual PDF parsing logic
    const extractedText = await extractTextFromPdf(pdfBuffer)
    
    // Split text into chunks
    const chunks = splitIntoChunks(extractedText, 1000) // 1000 characters per chunk
    
    // Generate embeddings for each chunk
    const processedChunks = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Generate embedding using OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: chunk,
        }),
      })

      if (!embeddingResponse.ok) {
        console.error(`Failed to generate embedding for chunk ${i}`)
        continue
      }

      const embeddingData = await embeddingResponse.json()
      const embedding = embeddingData.data[0]?.embedding

      if (embedding) {
        processedChunks.push({
          document_name: fileName,
          chunk_index: i,
          content: chunk,
          embedding: embedding,
          metadata: {
            total_chunks: chunks.length,
            chunk_size: chunk.length,
            processed_at: new Date().toISOString()
          }
        })
      }
    }

    // Insert chunks into database
    const { data, error } = await supabaseClient
      .from('document_chunks')
      .insert(processedChunks)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        message: 'PDF processed successfully',
        chunksProcessed: processedChunks.length,
        totalChunks: chunks.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in process-pdf function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// PDF text extraction using pdf-parse
async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // For now, we'll use a simple approach
    // In production, you'd want to use a proper PDF parsing library
    // like pdf-parse or pdfjs-dist
    
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Simple text extraction (placeholder)
    // This is a very basic implementation
    // In production, use proper PDF parsing libraries
    
    // Try to extract text using basic string matching
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(uint8Array);
    
    // Clean up the text (remove PDF metadata, etc.)
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' '); // Remove control characters
    text = text.replace(/\s+/g, ' '); // Normalize whitespace
    text = text.trim();
    
    // If no readable text found, return a message
    if (text.length < 50) {
      return "PDF 파일에서 텍스트를 추출할 수 없습니다. 이미지 기반 PDF이거나 보호된 파일일 수 있습니다.";
    }
    
    return text;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return "PDF 텍스트 추출 중 오류가 발생했습니다.";
  }
}

// Function to split text into chunks
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue
    
    if (currentChunk.length + trimmedSentence.length + 1 <= chunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.')
      }
      currentChunk = trimmedSentence
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.')
  }
  
  return chunks.filter(chunk => chunk.length > 10) // Filter out very short chunks
}
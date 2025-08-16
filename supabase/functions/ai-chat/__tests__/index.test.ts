import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Deno globals
global.Deno = {
  env: {
    get: vi.fn((key: string) => {
      const env: Record<string, string> = {
        OPENAI_API_KEY: 'test-openai-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
      };
      return env[key];
    }),
  },
} as any;

// Mock fetch
global.fetch = vi.fn();

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ 
      data: { id: 'test-student', name: 'Test Student' }, 
      error: null 
    }),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null,
    }),
  },
};

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Test AI response',
          },
        }],
      }),
    },
  },
};

vi.mock('https://esm.sh/openai@4', () => ({
  default: vi.fn(() => mockOpenAI),
}));

describe('AI Chat Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  const createMockRequest = (body: any, method = 'POST') => {
    return new Request('https://test.com', {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(body),
    });
  };

  it('should handle OPTIONS request (CORS preflight)', async () => {
    // Import the function dynamically to avoid module loading issues
    const { default: handler } = await import('../index.ts');
    
    const request = new Request('https://test.com', { method: 'OPTIONS' });
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should validate required fields', async () => {
    const { default: handler } = await import('../index.ts');
    
    const request = createMockRequest({
      // Missing required fields
    });

    const response = await handler(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain('Missing required fields');
  });

  it('should process valid chat request', async () => {
    const { default: handler } = await import('../index.ts');
    
    const request = createMockRequest({
      message: 'Hello, AI!',
      studentId: 'test-student-id',
      activityId: 'test-activity-id',
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.response).toBe('Test AI response');
    expect(mockSupabase.from).toHaveBeenCalledWith('chat_logs');
  });

  it('should handle streaming requests', async () => {
    const { default: handler } = await import('../index.ts');
    
    const request = createMockRequest({
      message: 'Hello, AI!',
      studentId: 'test-student-id',
      stream: true,
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
  });

  it('should handle RAG requests', async () => {
    const { default: handler } = await import('../index.ts');
    
    // Mock RAG search response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { content: 'Relevant context', similarity: 0.8 }
        ]
      }),
    });

    const request = createMockRequest({
      message: 'What is photosynthesis?',
      studentId: 'test-student-id',
      useRag: true,
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    
    // Should have called RAG search
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rag-search'),
      expect.any(Object)
    );
  });

  it('should handle authentication errors', async () => {
    const { default: handler } = await import('../index.ts');
    
    // Mock auth failure
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const request = createMockRequest({
      message: 'Hello',
      studentId: 'test-student-id',
    });

    const response = await handler(request);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toContain('Authentication failed');
  });

  it('should handle OpenAI API errors', async () => {
    const { default: handler } = await import('../index.ts');
    
    // Mock OpenAI error
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(
      new Error('OpenAI API error')
    );

    const request = createMockRequest({
      message: 'Hello',
      studentId: 'test-student-id',
    });

    const response = await handler(request);
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toContain('AI service error');
  });

  it('should sanitize input message', async () => {
    const { default: handler } = await import('../index.ts');
    
    const request = createMockRequest({
      message: '<script>alert("xss")</script>Hello',
      studentId: 'test-student-id',
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    
    // Should have sanitized the message before processing
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.not.stringContaining('<script>'),
          }),
        ]),
      })
    );
  });

  it('should log chat messages to database', async () => {
    const { default: handler } = await import('../index.ts');
    
    const request = createMockRequest({
      message: 'Hello',
      studentId: 'test-student-id',
      activityId: 'test-activity-id',
    });

    await handler(request);

    // Should log both user and AI messages
    expect(mockSupabase.from).toHaveBeenCalledWith('chat_logs');
    expect(mockSupabase.from().insert).toHaveBeenCalledTimes(2); // User message + AI response
  });

  it('should handle rate limiting', async () => {
    const { default: handler } = await import('../index.ts');
    
    // Make multiple requests quickly
    const requests = Array(10).fill(null).map(() => 
      createMockRequest({
        message: 'Hello',
        studentId: 'test-student-id',
      })
    );

    const responses = await Promise.all(
      requests.map(req => handler(req))
    );

    // Some requests should be rate limited
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  it('should validate student exists', async () => {
    const { default: handler } = await import('../index.ts');
    
    // Mock student not found
    mockSupabase.from().single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Student not found' },
    });

    const request = createMockRequest({
      message: 'Hello',
      studentId: 'non-existent-student',
    });

    const response = await handler(request);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toContain('Student not found');
  });
});
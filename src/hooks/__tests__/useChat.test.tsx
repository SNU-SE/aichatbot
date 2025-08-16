import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChat } from '../useChat';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(),
  },
}));

const mockSupabase = supabase as any;

describe('useChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock channel subscription
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    // Mock database operations
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });
  });

  it('initializes with empty messages and not loading', () => {
    const { result } = renderHook(() => useChat('activity-1'));
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends a message successfully', async () => {
    const mockResponse = {
      data: {
        response: 'AI response to the message',
        messageId: 'msg-123',
      },
      error: null,
    };
    
    mockSupabase.functions.invoke.mockResolvedValue(mockResponse);
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    await act(async () => {
      await result.current.sendMessage('Hello, AI!');
    });
    
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('ai-chat', {
      body: {
        message: 'Hello, AI!',
        activityId: 'activity-1',
        context: {},
      },
    });
  });

  it('handles message sending error', async () => {
    const mockError = new Error('Failed to send message');
    
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: mockError,
    });
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    await act(async () => {
      await result.current.sendMessage('Hello, AI!');
    });
    
    expect(result.current.error).toBe(mockError);
  });

  it('sets loading state during message sending', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    mockSupabase.functions.invoke.mockReturnValue(promise);
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    act(() => {
      result.current.sendMessage('Hello, AI!');
    });
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      resolvePromise!({
        data: { response: 'AI response', messageId: 'msg-123' },
        error: null,
      });
      await promise;
    });
    
    expect(result.current.loading).toBe(false);
  });

  it('loads chat history on mount', async () => {
    const mockMessages = [
      {
        id: '1',
        message: 'Hello',
        response: 'Hi there!',
        created_at: '2024-01-01T10:00:00Z',
        student_id: 'student-1',
      },
      {
        id: '2',
        message: 'How are you?',
        response: 'I am doing well, thank you!',
        created_at: '2024-01-01T10:01:00Z',
        student_id: 'student-1',
      },
    ];
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockMessages,
              error: null,
            }),
          }),
        }),
      }),
    });
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.messages).toHaveLength(4); // 2 messages * 2 (user + AI)
  });

  it('handles chat history loading error', async () => {
    const mockError = new Error('Failed to load messages');
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.error).toBe(mockError);
  });

  it('subscribes to real-time updates', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    renderHook(() => useChat('activity-1'));
    
    expect(mockSupabase.channel).toHaveBeenCalledWith('chat-activity-1');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_logs',
        filter: 'activity_id=eq.activity-1',
      },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('unsubscribes from real-time updates on unmount', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    const { unmount } = renderHook(() => useChat('activity-1'));
    
    unmount();
    
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('adds new messages from real-time updates', async () => {
    let realtimeCallback: (payload: any) => void;
    
    const mockChannel = {
      on: vi.fn().mockImplementation((event, config, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    const newMessage = {
      id: '3',
      message: 'New message',
      response: 'New response',
      created_at: '2024-01-01T10:02:00Z',
      student_id: 'student-1',
    };
    
    await act(async () => {
      realtimeCallback!({
        new: newMessage,
        eventType: 'INSERT',
      });
    });
    
    expect(result.current.messages).toContainEqual(
      expect.objectContaining({
        id: expect.stringContaining('3-user'),
        content: 'New message',
        sender: 'user',
      })
    );
    
    expect(result.current.messages).toContainEqual(
      expect.objectContaining({
        id: expect.stringContaining('3-ai'),
        content: 'New response',
        sender: 'ai',
      })
    );
  });

  it('sends message with file attachment', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    mockSupabase.functions.invoke.mockResolvedValue({
      data: {
        response: 'I received your file',
        messageId: 'msg-123',
      },
      error: null,
    });
    
    const { result } = renderHook(() => useChat('activity-1'));
    
    await act(async () => {
      await result.current.sendMessage('Here is a file', mockFile);
    });
    
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('ai-chat', {
      body: {
        message: 'Here is a file',
        activityId: 'activity-1',
        context: {},
        file: expect.any(Object),
      },
    });
  });

  it('clears error when sending new message', async () => {
    const { result } = renderHook(() => useChat('activity-1'));
    
    // Set an error first
    await act(async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Previous error'),
      });
      await result.current.sendMessage('First message');
    });
    
    expect(result.current.error).toBeTruthy();
    
    // Send another message successfully
    await act(async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          response: 'Success response',
          messageId: 'msg-123',
        },
        error: null,
      });
      await result.current.sendMessage('Second message');
    });
    
    expect(result.current.error).toBeNull();
  });

  it('handles streaming responses', async () => {
    const { result } = renderHook(() => useChat('activity-1', { streaming: true }));
    
    // Mock streaming response
    const mockStream = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('Hello '),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('world!'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }),
    };
    
    mockSupabase.functions.invoke.mockResolvedValue({
      data: mockStream,
      error: null,
    });
    
    await act(async () => {
      await result.current.sendMessage('Hello');
    });
    
    // Check that streaming message was added and updated
    const aiMessages = result.current.messages.filter(m => m.sender === 'ai');
    expect(aiMessages[aiMessages.length - 1].content).toBe('Hello world!');
  });
});
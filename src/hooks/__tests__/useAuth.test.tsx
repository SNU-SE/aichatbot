import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

const mockSupabase = supabase as any;

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('initializes with no user and loading state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.userRole).toBeNull();
  });

  it('handles successful login', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: {},
    };
    
    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'student' },
            error: null,
          }),
        }),
      }),
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('handles login error', async () => {
    const mockError = new Error('Invalid credentials');
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrongpassword');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });
    
    expect(result.current.user).toBeNull();
  });

  it('handles successful signup', async () => {
    const mockUser = {
      id: '123',
      email: 'newuser@example.com',
      user_metadata: {},
    };
    
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signUp('newuser@example.com', 'password', 'New User');
    });
    
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password',
      options: {
        data: {
          full_name: 'New User',
        },
      },
    });
  });

  it('handles signup error', async () => {
    const mockError = new Error('Email already exists');
    
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      try {
        await result.current.signUp('existing@example.com', 'password', 'User');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });
  });

  it('handles successful logout', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signOut();
    });
    
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('fetches user role when user is authenticated', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };
    
    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        }),
      }),
    });
    
    const { result } = renderHook(() => useAuth());
    
    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.userRole).toBe('admin');
  });

  it('handles role fetch error gracefully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };
    
    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Role not found'),
          }),
        }),
      }),
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.userRole).toBeNull();
  });

  it('sets loading to false after initialization', async () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.loading).toBe(false);
  });

  it('updates user state when auth state changes', async () => {
    let authStateCallback: any;
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
    
    const { result } = renderHook(() => useAuth());
    
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };
    
    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'student' },
            error: null,
          }),
        }),
      }),
    });
    
    await act(async () => {
      authStateCallback('SIGNED_IN', mockSession);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.user).toBe(mockUser);
    expect(result.current.userRole).toBe('student');
  });

  it('clears user state when signed out', async () => {
    let authStateCallback: any;
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      authStateCallback('SIGNED_OUT', null);
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.userRole).toBeNull();
  });

  it('unsubscribes from auth state changes on unmount', () => {
    const mockUnsubscribe = vi.fn();
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
    
    const { unmount } = renderHook(() => useAuth());
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('Authentication Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('User Authentication Flow', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      const mockUserRole = {
        id: 'test-role-id',
        user_id: 'test-user-id',
        role: 'student',
      };

      // Mock successful auth
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock role fetch
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUserRole,
          error: null,
        }),
      });

      // Mock auth state change
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        callback('SIGNED_IN', mockUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userRole).toBe('student');
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle login failure', async () => {
      // Mock auth failure
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.userRole).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle role-based access control', async () => {
      const mockAdminUser = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        user_metadata: { name: 'Admin User' },
      };

      const mockAdminRole = {
        id: 'admin-role-id',
        user_id: 'admin-user-id',
        role: 'admin',
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockAdminUser },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAdminRole,
          error: null,
        }),
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        callback('SIGNED_IN', mockAdminUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userRole).toBe('admin');
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isStudent).toBe(false);
      });
    });

    it('should handle missing user role', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock role not found
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Role not found' },
        }),
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        callback('SIGNED_IN', mockUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userRole).toBeNull();
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle logout', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      // Initial authenticated state
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let authCallback: (event: string, session: any) => void;
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        authCallback = callback;
        callback('SIGNED_IN', mockUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate logout
      (supabase.auth.signOut as any).mockResolvedValue({
        error: null,
      });

      await result.current.signOut();

      // Simulate auth state change
      authCallback!('SIGNED_OUT', null);

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.userRole).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Session Management', () => {
    it('should handle session refresh', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      let authCallback: (event: string, session: any) => void;
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate token refresh
      authCallback!('TOKEN_REFRESHED', mockUser);

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle session expiry', async () => {
      let authCallback: (event: string, session: any) => void;
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate session expiry
      authCallback!('SIGNED_OUT', null);

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during authentication', async () => {
      (supabase.auth.getUser as any).mockRejectedValue(
        new Error('Network error')
      );

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle database errors when fetching user role', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock database error
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        callback('SIGNED_IN', mockUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userRole).toBeNull();
        expect(result.current.error).toBeTruthy();
      });
    });
  });
});
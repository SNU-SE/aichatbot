import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useOptimizedFilter,
  useOptimizedSort,
  useOptimizedGroupBy,
  useOptimizedSearch,
  useOptimizedPagination,
  useDebouncedValue,
  useThrottledCallback,
  useDebouncedCallback,
} from '../useOptimizedData';

// Mock lodash-es
vi.mock('lodash-es', () => ({
  debounce: vi.fn((fn, delay) => {
    let timeoutId: NodeJS.Timeout;
    const debouncedFn = (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
    debouncedFn.cancel = () => clearTimeout(timeoutId);
    return debouncedFn;
  }),
  throttle: vi.fn((fn, delay) => {
    let lastCall = 0;
    const throttledFn = (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    };
    throttledFn.cancel = () => {};
    return throttledFn;
  }),
}));

describe('useOptimizedData hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockData = [
    { id: 1, name: 'Alice', age: 25, category: 'A' },
    { id: 2, name: 'Bob', age: 30, category: 'B' },
    { id: 3, name: 'Charlie', age: 35, category: 'A' },
    { id: 4, name: 'David', age: 28, category: 'B' },
  ];

  describe('useOptimizedFilter', () => {
    it('should filter data based on query', () => {
      const filterFn = (item: any, query: string) => 
        item.name.toLowerCase().includes(query.toLowerCase());

      const { result } = renderHook(() => 
        useOptimizedFilter(mockData, filterFn, 'alice')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe('Alice');
    });

    it('should return all data when query is empty', () => {
      const filterFn = (item: any, query: string) => 
        item.name.toLowerCase().includes(query.toLowerCase());

      const { result } = renderHook(() => 
        useOptimizedFilter(mockData, filterFn, '')
      );

      expect(result.current).toHaveLength(4);
    });

    it('should memoize results', () => {
      const filterFn = vi.fn((item: any, query: string) => 
        item.name.toLowerCase().includes(query.toLowerCase())
      );

      const { result, rerender } = renderHook(
        ({ data, query }) => useOptimizedFilter(data, filterFn, query),
        { initialProps: { data: mockData, query: 'alice' } }
      );

      const firstResult = result.current;
      
      // Rerender with same props
      rerender({ data: mockData, query: 'alice' });
      
      expect(result.current).toBe(firstResult); // Same reference due to memoization
    });
  });

  describe('useOptimizedSort', () => {
    it('should sort data', () => {
      const sortFn = (a: any, b: any) => a.age - b.age;

      const { result } = renderHook(() => 
        useOptimizedSort(mockData, sortFn)
      );

      expect(result.current[0].age).toBe(25);
      expect(result.current[3].age).toBe(35);
    });

    it('should not mutate original data', () => {
      const sortFn = (a: any, b: any) => a.age - b.age;

      const { result } = renderHook(() => 
        useOptimizedSort(mockData, sortFn)
      );

      expect(result.current).not.toBe(mockData);
      expect(mockData[0].age).toBe(25); // Original order preserved
    });
  });

  describe('useOptimizedGroupBy', () => {
    it('should group data by key', () => {
      const keyFn = (item: any) => item.category;

      const { result } = renderHook(() => 
        useOptimizedGroupBy(mockData, keyFn)
      );

      expect(result.current.A).toHaveLength(2);
      expect(result.current.B).toHaveLength(2);
      expect(result.current.A[0].name).toBe('Alice');
      expect(result.current.A[1].name).toBe('Charlie');
    });
  });

  describe('useOptimizedSearch', () => {
    it('should search across multiple fields', () => {
      const { result } = renderHook(() => 
        useOptimizedSearch(mockData, ['name', 'category'], 'a')
      );

      // Should find Alice (name contains 'a') and items with category 'A'
      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.some(item => item.name === 'Alice')).toBe(true);
    });

    it('should respect minimum query length', () => {
      const { result } = renderHook(() => 
        useOptimizedSearch(mockData, ['name'], 'a', { minQueryLength: 2 })
      );

      expect(result.current).toHaveLength(4); // Returns all data when query too short
    });

    it('should handle case sensitivity', () => {
      const { result: caseSensitive } = renderHook(() => 
        useOptimizedSearch(mockData, ['name'], 'ALICE', { caseSensitive: true })
      );

      const { result: caseInsensitive } = renderHook(() => 
        useOptimizedSearch(mockData, ['name'], 'ALICE', { caseSensitive: false })
      );

      expect(caseSensitive.current).toHaveLength(0);
      expect(caseInsensitive.current).toHaveLength(1);
    });
  });

  describe('useOptimizedPagination', () => {
    it('should paginate data correctly', () => {
      const { result } = renderHook(() => 
        useOptimizedPagination(mockData, 2, 1)
      );

      expect(result.current.data).toHaveLength(2);
      expect(result.current.totalPages).toBe(2);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('should handle second page', () => {
      const { result } = renderHook(() => 
        useOptimizedPagination(mockData, 2, 2)
      );

      expect(result.current.data).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(true);
    });

    it('should calculate total items correctly', () => {
      const { result } = renderHook(() => 
        useOptimizedPagination(mockData, 3, 1)
      );

      expect(result.current.totalItems).toBe(4);
      expect(result.current.totalPages).toBe(2);
    });
  });

  describe('useDebouncedValue', () => {
    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'changed' });
      expect(result.current).toBe('initial'); // Still old value

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('changed'); // Now updated
    });
  });

  describe('useThrottledCallback', () => {
    it('should throttle callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(callback, 300)
      );

      // Call multiple times quickly
      act(() => {
        result.current();
        result.current();
        result.current();
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDebouncedCallback', () => {
    it('should debounce callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, 300)
      );

      // Call multiple times quickly
      act(() => {
        result.current();
        result.current();
        result.current();
      });

      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
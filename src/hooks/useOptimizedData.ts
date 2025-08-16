import { useMemo, useCallback, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash-es';

// 메모화된 데이터 필터링 훅
export function useOptimizedFilter<T>(
  data: T[],
  filterFn: (item: T, query: string) => boolean,
  query: string,
  deps: React.DependencyList = []
) {
  return useMemo(() => {
    if (!query.trim()) return data;
    return data.filter(item => filterFn(item, query));
  }, [data, query, filterFn, ...deps]);
}

// 메모화된 데이터 정렬 훅
export function useOptimizedSort<T>(
  data: T[],
  sortFn: (a: T, b: T) => number,
  deps: React.DependencyList = []
) {
  return useMemo(() => {
    return [...data].sort(sortFn);
  }, [data, sortFn, ...deps]);
}

// 메모화된 데이터 그룹화 훅
export function useOptimizedGroupBy<T, K extends string | number>(
  data: T[],
  keyFn: (item: T) => K,
  deps: React.DependencyList = []
) {
  return useMemo(() => {
    return data.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  }, [data, keyFn, ...deps]);
}

// 메모화된 통계 계산 훅
export function useOptimizedStats<T>(
  data: T[],
  statsFn: (data: T[]) => Record<string, any>,
  deps: React.DependencyList = []
) {
  return useMemo(() => {
    return statsFn(data);
  }, [data, statsFn, ...deps]);
}

// 디바운스된 값 훅
export function useDebouncedValue<T>(value: T, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 스로틀된 콜백 훅
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
) {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay, ...deps]
  );

  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);

  return throttledCallback;
}

// 디바운스된 콜백 훅
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
) {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay, ...deps]
  );

  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback;
}

// 메모화된 검색 훅
export function useOptimizedSearch<T>(
  data: T[],
  searchFields: (keyof T)[],
  query: string,
  options: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
    minQueryLength?: number;
  } = {}
) {
  const {
    caseSensitive = false,
    exactMatch = false,
    minQueryLength = 1,
  } = options;

  const debouncedQuery = useDebouncedValue(query, 300);

  return useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      return data;
    }

    const searchQuery = caseSensitive ? debouncedQuery : debouncedQuery.toLowerCase();

    return data.filter(item => {
      return searchFields.some(field => {
        const fieldValue = item[field];
        if (typeof fieldValue !== 'string') return false;

        const value = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        
        return exactMatch 
          ? value === searchQuery
          : value.includes(searchQuery);
      });
    });
  }, [data, searchFields, debouncedQuery, caseSensitive, exactMatch, minQueryLength]);
}

// 페이지네이션 최적화 훅
export function useOptimizedPagination<T>(
  data: T[],
  pageSize: number = 10,
  currentPage: number = 1
) {
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, pageSize, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize);
  }, [data.length, pageSize]);

  const hasNextPage = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return currentPage > 1;
  }, [currentPage]);

  return {
    data: paginatedData,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    totalItems: data.length,
  };
}

// 무한 스크롤 최적화 훅
export function useOptimizedInfiniteScroll<T>(
  data: T[],
  pageSize: number = 20,
  hasMore: boolean = true,
  loadMore: () => void
) {
  const [displayedData, setDisplayedData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const loadingRef = useRef(false);

  // 초기 데이터 로드
  useEffect(() => {
    const initialData = data.slice(0, pageSize);
    setDisplayedData(initialData);
    setCurrentPage(1);
  }, [data, pageSize]);

  // 더 많은 데이터 로드
  const loadMoreData = useCallback(() => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const newData = data.slice(startIndex, endIndex);

    if (newData.length > 0) {
      setDisplayedData(prev => [...prev, ...newData]);
      setCurrentPage(nextPage);
    }

    if (endIndex >= data.length) {
      loadMore();
    }

    loadingRef.current = false;
  }, [data, currentPage, pageSize, hasMore, loadMore]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useThrottledCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMoreData();
    }
  }, 200);

  return {
    data: displayedData,
    loadMore: loadMoreData,
    handleScroll,
    isLoading: loadingRef.current,
  };
}

// 메모화된 차트 데이터 훅
export function useOptimizedChartData<T>(
  data: T[],
  transformFn: (data: T[]) => any,
  deps: React.DependencyList = []
) {
  return useMemo(() => {
    return transformFn(data);
  }, [data, transformFn, ...deps]);
}

// 메모화된 폼 검증 훅
export function useOptimizedValidation<T extends Record<string, any>>(
  values: T,
  validationRules: Record<keyof T, (value: any) => string | null>,
  deps: React.DependencyList = []
) {
  return useMemo(() => {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach(key => {
      const rule = validationRules[key];
      const error = rule(values[key]);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    return { errors, isValid };
  }, [values, validationRules, ...deps]);
}

// 메모화된 테이블 데이터 훅 (정렬, 필터링, 페이지네이션 통합)
export function useOptimizedTable<T>(
  data: T[],
  options: {
    searchQuery?: string;
    searchFields?: (keyof T)[];
    sortField?: keyof T;
    sortDirection?: 'asc' | 'desc';
    pageSize?: number;
    currentPage?: number;
    filters?: Record<string, any>;
  } = {}
) {
  const {
    searchQuery = '',
    searchFields = [],
    sortField,
    sortDirection = 'asc',
    pageSize = 10,
    currentPage = 1,
    filters = {},
  } = options;

  // 검색 적용
  const searchedData = useOptimizedSearch(data, searchFields, searchQuery);

  // 필터 적용
  const filteredData = useMemo(() => {
    return searchedData.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true;
        return item[key as keyof T] === value;
      });
    });
  }, [searchedData, filters]);

  // 정렬 적용
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // 페이지네이션 적용
  const paginationResult = useOptimizedPagination(sortedData, pageSize, currentPage);

  return {
    ...paginationResult,
    totalFilteredItems: sortedData.length,
    totalOriginalItems: data.length,
  };
}
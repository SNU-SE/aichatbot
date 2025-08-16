import { QueryClient } from '@tanstack/react-query';

// 최적화된 Query Client 설정
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 시간 설정 (5분)
      staleTime: 5 * 60 * 1000,
      // 가비지 컬렉션 시간 (10분)
      gcTime: 10 * 60 * 1000,
      // 에러 재시도 설정
      retry: (failureCount, error: any) => {
        // 401, 403 에러는 재시도하지 않음
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // 최대 3번까지 재시도
        return failureCount < 3;
      },
      // 재시도 지연 시간 (지수 백오프)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 백그라운드에서 자동 새로고침 비활성화 (성능 향상)
      refetchOnWindowFocus: false,
      // 네트워크 재연결 시 자동 새로고침
      refetchOnReconnect: true,
      // 마운트 시 자동 새로고침 (개발 환경에서만)
      refetchOnMount: process.env.NODE_ENV === 'development',
    },
    mutations: {
      // 뮤테이션 재시도 설정
      retry: 1,
      // 뮤테이션 재시도 지연
      retryDelay: 1000,
    },
  },
});

// 쿼리 키 팩토리 (일관된 키 관리)
export const queryKeys = {
  // 학생 관련
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.students.lists(), { filters }] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    sessions: (id: string) => [...queryKeys.students.detail(id), 'sessions'] as const,
  },
  
  // 활동 관련
  activities: {
    all: ['activities'] as const,
    lists: () => [...queryKeys.activities.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.activities.lists(), { filters }] as const,
    details: () => [...queryKeys.activities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.activities.details(), id] as const,
    checklist: (id: string) => [...queryKeys.activities.detail(id), 'checklist'] as const,
  },
  
  // 채팅 관련
  chat: {
    all: ['chat'] as const,
    histories: () => [...queryKeys.chat.all, 'history'] as const,
    history: (studentId: string, activityId?: string) => 
      [...queryKeys.chat.histories(), { studentId, activityId }] as const,
    statistics: () => [...queryKeys.chat.all, 'statistics'] as const,
    stats: (timeRange: string) => [...queryKeys.chat.statistics(), { timeRange }] as const,
  },
  
  // 파일 관련
  files: {
    all: ['files'] as const,
    lists: () => [...queryKeys.files.all, 'list'] as const,
    list: (path: string) => [...queryKeys.files.lists(), { path }] as const,
    details: () => [...queryKeys.files.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.files.details(), id] as const,
  },
  
  // 논증 관련
  argumentation: {
    all: ['argumentation'] as const,
    responses: () => [...queryKeys.argumentation.all, 'responses'] as const,
    response: (studentId: string, activityId: string) => 
      [...queryKeys.argumentation.responses(), { studentId, activityId }] as const,
    evaluations: () => [...queryKeys.argumentation.all, 'evaluations'] as const,
    evaluation: (id: string) => [...queryKeys.argumentation.evaluations(), id] as const,
  },
} as const;

// 캐시 무효화 헬퍼
export const invalidateQueries = {
  students: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  activities: () => queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
  chat: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat.all }),
  files: () => queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
  argumentation: () => queryClient.invalidateQueries({ queryKey: queryKeys.argumentation.all }),
  
  // 특정 학생 관련 모든 데이터
  studentData: (studentId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.histories() });
    queryClient.invalidateQueries({ queryKey: queryKeys.argumentation.responses() });
  },
  
  // 특정 활동 관련 모든 데이터
  activityData: (activityId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.activities.detail(activityId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.histories() });
    queryClient.invalidateQueries({ queryKey: queryKeys.argumentation.responses() });
  },
};

// 프리페치 헬퍼
export const prefetchQueries = {
  students: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.students.lists(),
      queryFn: async () => {
        // 학생 목록 프리페치 로직
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase.from('students').select('*').limit(50);
        return data || [];
      },
      staleTime: 10 * 60 * 1000, // 10분
    });
  },
  
  activities: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.activities.lists(),
      queryFn: async () => {
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase.from('activities').select('*').limit(20);
        return data || [];
      },
      staleTime: 10 * 60 * 1000,
    });
  },
};

// 캐시 최적화 설정
export const cacheOptimizations = {
  // 메모리 사용량 제한 (50MB)
  maxMemoryUsage: 50 * 1024 * 1024,
  
  // 캐시 정리 주기 (5분마다)
  cleanupInterval: 5 * 60 * 1000,
  
  // 백그라운드 업데이트 최적화
  backgroundUpdateInterval: 30 * 1000, // 30초
  
  // 배치 업데이트 설정
  batchUpdates: true,
  batchUpdateDelay: 100, // 100ms
};

// 개발 환경에서 쿼리 디버깅
if (process.env.NODE_ENV === 'development') {
  // React Query DevTools 설정
  queryClient.setDefaultOptions({
    queries: {
      ...queryClient.getDefaultOptions().queries,
      // 개발 환경에서는 더 자주 새로고침
      staleTime: 1 * 60 * 1000, // 1분
    },
  });
}

// 에러 로깅
queryClient.setMutationDefaults(['mutation'], {
  onError: (error) => {
    console.error('Mutation error:', error);
    // 에러 리포팅 서비스로 전송 (예: Sentry)
  },
});

queryClient.setQueryDefaults(['query'], {
  onError: (error) => {
    console.error('Query error:', error);
    // 에러 리포팅 서비스로 전송
  },
});
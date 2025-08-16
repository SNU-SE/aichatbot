import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { validateData, ValidationSchema, csrfProtection, sanitizeLogData } from '../utils/security';

// API 요청 제한을 위한 레이트 리미터
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // 윈도우 밖의 요청들 제거
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

// 전역 레이트 리미터 인스턴스
const globalRateLimiter = new RateLimiter(100, 60000); // 분당 100회
const authRateLimiter = new RateLimiter(10, 60000); // 인증 관련은 분당 10회

// 보안 API 훅
export function useSecureApi() {
  const { user, userRole } = useAuth();
  const requestIdRef = useRef(0);

  // 요청 ID 생성
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${++requestIdRef.current}`;
  }, []);

  // 권한 검증
  const checkPermission = useCallback((requiredRole: string, resource?: string): boolean => {
    if (!user || !userRole) {
      console.warn('User not authenticated');
      return false;
    }

    // 관리자는 모든 권한
    if (userRole === 'admin') {
      return true;
    }

    // 학생은 자신의 리소스만 접근 가능
    if (userRole === 'student') {
      if (requiredRole === 'student') {
        return true;
      }
      // 특정 리소스에 대한 소유권 검증
      if (resource && resource.includes(user.id)) {
        return true;
      }
    }

    return false;
  }, [user, userRole]);

  // 보안 API 요청 함수
  const secureRequest = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      requiredRole?: string;
      resource?: string;
      validationSchema?: ValidationSchema;
      data?: Record<string, any>;
      rateLimitKey?: string;
      skipRateLimit?: boolean;
    } = {}
  ): Promise<T> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // 1. 인증 확인
      if (!user) {
        throw new Error('Authentication required');
      }

      // 2. 권한 확인
      if (options.requiredRole && !checkPermission(options.requiredRole, options.resource)) {
        throw new Error('Insufficient permissions');
      }

      // 3. 레이트 리미팅
      if (!options.skipRateLimit) {
        const rateLimitKey = options.rateLimitKey || user.id;
        const limiter = options.requiredRole === 'admin' ? globalRateLimiter : authRateLimiter;
        
        if (!limiter.isAllowed(rateLimitKey)) {
          throw new Error('Rate limit exceeded');
        }
      }

      // 4. 데이터 검증
      if (options.validationSchema && options.data) {
        const validation = validateData(options.data, options.validationSchema);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
        }
      }

      // 5. CSRF 토큰 검증 (POST/PUT/DELETE 요청)
      const csrfToken = csrfProtection.getToken();
      if (csrfToken && !csrfProtection.validateToken(csrfToken)) {
        throw new Error('CSRF token validation failed');
      }

      // 6. 요청 실행
      console.log(`[${requestId}] Starting secure request`, {
        user: user.id,
        role: userRole,
        requiredRole: options.requiredRole,
        resource: options.resource,
      });

      const result = await operation();

      // 7. 성공 로깅
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Request completed successfully`, {
        duration: `${duration}ms`,
        user: user.id,
      });

      return result;

    } catch (error) {
      // 8. 에러 로깅 (민감한 정보 제거)
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Request failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        user: user?.id,
        sanitizedData: options.data ? sanitizeLogData(options.data) : undefined,
      });

      throw error;
    }
  }, [user, userRole, checkPermission, generateRequestId]);

  // 보안 쿼리 함수
  const secureQuery = useCallback(async (
    table: string,
    query: any,
    options: {
      requiredRole?: string;
      resource?: string;
    } = {}
  ) => {
    return secureRequest(
      async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      {
        requiredRole: options.requiredRole,
        resource: options.resource,
        rateLimitKey: `query_${table}_${user?.id}`,
      }
    );
  }, [secureRequest, user]);

  // 보안 뮤테이션 함수
  const secureMutation = useCallback(async (
    operation: 'insert' | 'update' | 'delete',
    table: string,
    data: any,
    options: {
      requiredRole?: string;
      resource?: string;
      validationSchema?: ValidationSchema;
    } = {}
  ) => {
    return secureRequest(
      async () => {
        let query;
        
        switch (operation) {
          case 'insert':
            query = supabase.from(table).insert(data);
            break;
          case 'update':
            query = supabase.from(table).update(data);
            break;
          case 'delete':
            query = supabase.from(table).delete();
            break;
          default:
            throw new Error('Invalid operation');
        }

        const { data: result, error } = await query;
        if (error) throw error;
        return result;
      },
      {
        requiredRole: options.requiredRole,
        resource: options.resource,
        validationSchema: options.validationSchema,
        data,
        rateLimitKey: `mutation_${operation}_${table}_${user?.id}`,
      }
    );
  }, [secureRequest, user]);

  // 파일 업로드 보안 함수
  const secureFileUpload = useCallback(async (
    file: File,
    path: string,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      requiredRole?: string;
    } = {}
  ) => {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
      requiredRole = 'student',
    } = options;

    return secureRequest(
      async () => {
        // 파일 검증
        if (file.size > maxSize) {
          throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        }

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} not allowed`);
        }

        // 파일명 정화
        const sanitizedPath = path.replace(/[^a-zA-Z0-9가-힣._/-]/g, '_');

        // Supabase Storage 업로드
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(sanitizedPath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;
        return data;
      },
      {
        requiredRole,
        rateLimitKey: `file_upload_${user?.id}`,
      }
    );
  }, [secureRequest, user]);

  // 보안 RPC 호출 함수
  const secureRpc = useCallback(async (
    functionName: string,
    params: Record<string, any> = {},
    options: {
      requiredRole?: string;
      validationSchema?: ValidationSchema;
    } = {}
  ) => {
    return secureRequest(
      async () => {
        const { data, error } = await supabase.rpc(functionName, params);
        if (error) throw error;
        return data;
      },
      {
        requiredRole: options.requiredRole,
        validationSchema: options.validationSchema,
        data: params,
        rateLimitKey: `rpc_${functionName}_${user?.id}`,
      }
    );
  }, [secureRequest, user]);

  // 감사 로그 기록 함수
  const auditLog = useCallback(async (
    action: string,
    resource: string,
    details?: Record<string, any>
  ) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action,
        resource,
        details: sanitizeLogData(details),
        ip_address: 'client', // 클라이언트에서는 실제 IP를 얻기 어려움
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }, [user]);

  return {
    secureRequest,
    secureQuery,
    secureMutation,
    secureFileUpload,
    secureRpc,
    checkPermission,
    auditLog,
  };
}

// 보안 컨텍스트 훅 (전역 보안 설정)
export function useSecurityContext() {
  const { user } = useAuth();

  // 세션 타임아웃 관리
  const checkSessionTimeout = useCallback(() => {
    const lastActivity = localStorage.getItem('last_activity');
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      const timeoutDuration = 30 * 60 * 1000; // 30분

      if (timeSinceLastActivity > timeoutDuration) {
        // 세션 만료
        supabase.auth.signOut();
        localStorage.removeItem('last_activity');
        return false;
      }
    }
    return true;
  }, []);

  // 활동 시간 업데이트
  const updateLastActivity = useCallback(() => {
    localStorage.setItem('last_activity', Date.now().toString());
  }, []);

  // 보안 이벤트 리스너 설정
  const setupSecurityListeners = useCallback(() => {
    // 페이지 가시성 변경 감지
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionTimeout();
      }
    };

    // 사용자 활동 감지
    const handleUserActivity = () => {
      updateLastActivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
    };
  }, [checkSessionTimeout, updateLastActivity]);

  return {
    checkSessionTimeout,
    updateLastActivity,
    setupSecurityListeners,
  };
}
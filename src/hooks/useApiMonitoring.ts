import { useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

// API 호출 메트릭 인터페이스
interface ApiMetrics {
  endpoint: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: Error;
  requestSize?: number;
  responseSize?: number;
  userId?: string;
}

// API 사용량 통계
interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  errorsByType: Record<string, number>;
}

// API 모니터링 훅
export function useApiMonitoring() {
  const metricsRef = useRef<ApiMetrics[]>([]);
  const requestCountRef = useRef<number>(0);
  const windowStartRef = useRef<number>(Date.now());

  // API 호출 시작 추적
  const startApiCall = useCallback((endpoint: string, method: string, requestData?: any): string => {
    const callId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const metrics: ApiMetrics = {
      endpoint,
      method,
      startTime,
      requestSize: requestData ? JSON.stringify(requestData).length : 0,
    };

    metricsRef.current.push(metrics);
    requestCountRef.current++;

    // 요청 시작 로깅
    logger.info('API_CALL_START', `${method} ${endpoint}`, {
      callId,
      endpoint,
      method,
      requestSize: metrics.requestSize,
      timestamp: startTime,
    });

    return callId;
  }, []);

  // API 호출 완료 추적
  const endApiCall = useCallback((
    callId: string,
    status: number,
    responseData?: any,
    error?: Error
  ) => {
    const endTime = Date.now();
    const metrics = metricsRef.current.find(m => 
      m.startTime <= endTime && !m.endTime
    );

    if (metrics) {
      metrics.endTime = endTime;
      metrics.duration = endTime - metrics.startTime;
      metrics.status = status;
      metrics.error = error;
      metrics.responseSize = responseData ? JSON.stringify(responseData).length : 0;

      // 완료 로깅
      logger.apiCall(
        metrics.method,
        metrics.endpoint,
        metrics.duration,
        status,
        {
          callId,
          requestSize: metrics.requestSize,
          responseSize: metrics.responseSize,
          error: error?.message,
        }
      );

      // 에러 발생 시 추가 로깅
      if (error) {
        logger.error('API_CALL_ERROR', `${metrics.method} ${metrics.endpoint} failed`, error, {
          callId,
          status,
          duration: metrics.duration,
        });
      }

      // 느린 API 호출 경고
      if (metrics.duration > 5000) {
        logger.warn('SLOW_API_CALL', `Slow API call detected: ${metrics.method} ${metrics.endpoint}`, {
          callId,
          duration: metrics.duration,
          status,
        });
      }
    }
  }, []);

  // 사용량 통계 계산
  const getUsageStats = useCallback((): ApiUsageStats => {
    const now = Date.now();
    const windowDuration = now - windowStartRef.current;
    const completedMetrics = metricsRef.current.filter(m => m.endTime);

    const totalRequests = completedMetrics.length;
    const successfulRequests = completedMetrics.filter(m => 
      m.status && m.status >= 200 && m.status < 400
    ).length;
    const failedRequests = totalRequests - successfulRequests;

    const averageResponseTime = totalRequests > 0 
      ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalRequests
      : 0;

    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    const requestsPerMinute = windowDuration > 0 
      ? (totalRequests / windowDuration) * 60000 
      : 0;

    // 엔드포인트별 요청 수 집계
    const endpointCounts = completedMetrics.reduce((acc, m) => {
      acc[m.endpoint] = (acc[m.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // 에러 타입별 집계
    const errorsByType = completedMetrics
      .filter(m => m.error)
      .reduce((acc, m) => {
        const errorType = m.error?.name || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      errorRate,
      requestsPerMinute,
      topEndpoints,
      errorsByType,
    };
  }, []);

  // 메트릭 리셋
  const resetMetrics = useCallback(() => {
    metricsRef.current = [];
    requestCountRef.current = 0;
    windowStartRef.current = Date.now();
  }, []);

  // 주기적 통계 리포트
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getUsageStats();
      
      // 통계 로깅
      logger.info('API_USAGE_STATS', 'Periodic API usage statistics', {
        ...stats,
        timestamp: Date.now(),
      });

      // 임계값 초과 시 경고
      if (stats.errorRate > 0.1) {
        logger.warn('HIGH_ERROR_RATE', `API error rate is high: ${(stats.errorRate * 100).toFixed(1)}%`, {
          errorRate: stats.errorRate,
          totalRequests: stats.totalRequests,
          failedRequests: stats.failedRequests,
        });
      }

      if (stats.averageResponseTime > 2000) {
        logger.warn('SLOW_API_PERFORMANCE', `Average API response time is slow: ${stats.averageResponseTime.toFixed(0)}ms`, {
          averageResponseTime: stats.averageResponseTime,
          totalRequests: stats.totalRequests,
        });
      }

      // 오래된 메트릭 정리 (1시간 이상)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      metricsRef.current = metricsRef.current.filter(m => m.startTime > oneHourAgo);
    }, 5 * 60 * 1000); // 5분마다

    return () => clearInterval(interval);
  }, [getUsageStats]);

  return {
    startApiCall,
    endApiCall,
    getUsageStats,
    resetMetrics,
  };
}

// Fetch API 래퍼 (자동 모니터링 포함)
export function useMonitoredFetch() {
  const { startApiCall, endApiCall } = useApiMonitoring();

  const monitoredFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const method = options.method || 'GET';
    const callId = startApiCall(url, method, options.body);

    try {
      const response = await fetch(url, options);
      
      endApiCall(callId, response.status, null, response.ok ? undefined : new Error(`HTTP ${response.status}`));
      
      return response;
    } catch (error) {
      endApiCall(callId, 0, null, error as Error);
      throw error;
    }
  }, [startApiCall, endApiCall]);

  return monitoredFetch;
}

// Supabase 클라이언트 래퍼 (자동 모니터링 포함)
export function useMonitoredSupabase() {
  const { startApiCall, endApiCall } = useApiMonitoring();

  const monitoredQuery = useCallback(async (
    table: string,
    operation: string,
    queryBuilder: any
  ) => {
    const endpoint = `/rest/v1/${table}`;
    const callId = startApiCall(endpoint, operation.toUpperCase());

    try {
      const { data, error } = await queryBuilder;
      
      if (error) {
        endApiCall(callId, 400, null, new Error(error.message));
        throw error;
      }

      endApiCall(callId, 200, data);
      return { data, error };
    } catch (error) {
      endApiCall(callId, 500, null, error as Error);
      throw error;
    }
  }, [startApiCall, endApiCall]);

  return { monitoredQuery };
}

// 레이트 리미팅 모니터링
export function useRateLimitMonitoring() {
  const requestTimestamps = useRef<number[]>([]);

  const checkRateLimit = useCallback((
    maxRequests: number = 100,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // 윈도우 밖의 요청 제거
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );

    const currentRequests = requestTimestamps.current.length;
    const allowed = currentRequests < maxRequests;
    const remaining = Math.max(0, maxRequests - currentRequests);
    const resetTime = windowStart + windowMs;

    if (allowed) {
      requestTimestamps.current.push(now);
    } else {
      logger.warn('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', {
        maxRequests,
        currentRequests,
        windowMs,
        resetTime,
      });
    }

    return { allowed, remaining, resetTime };
  }, []);

  return { checkRateLimit };
}

// API 헬스 체크
export function useApiHealthCheck() {
  const healthCheckResults = useRef<Record<string, boolean>>({});

  const checkEndpointHealth = useCallback(async (
    endpoint: string,
    timeout: number = 5000
  ): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const isHealthy = response.ok;
      healthCheckResults.current[endpoint] = isHealthy;

      logger.info('API_HEALTH_CHECK', `Health check for ${endpoint}`, {
        endpoint,
        healthy: isHealthy,
        status: response.status,
        responseTime: Date.now(),
      });

      return isHealthy;
    } catch (error) {
      clearTimeout(timeoutId);
      healthCheckResults.current[endpoint] = false;

      logger.error('API_HEALTH_CHECK_FAILED', `Health check failed for ${endpoint}`, error as Error, {
        endpoint,
        timeout,
      });

      return false;
    }
  }, []);

  const getHealthStatus = useCallback(() => {
    return { ...healthCheckResults.current };
  }, []);

  return { checkEndpointHealth, getHealthStatus };
}
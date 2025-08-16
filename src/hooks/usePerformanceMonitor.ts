import { useEffect, useCallback, useRef } from 'react';

// 성능 메트릭 인터페이스
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: number;
  connectionType?: string;
}

// 성능 모니터링 훅
export function usePerformanceMonitor() {
  const metricsRef = useRef<PerformanceMetrics>({
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
  });

  // Web Vitals 수집
  const collectWebVitals = useCallback(() => {
    // Performance Observer 지원 확인
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // LCP (Largest Contentful Paint) 측정
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      metricsRef.current.largestContentfulPaint = lastEntry.startTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay) 측정
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        metricsRef.current.firstInputDelay = entry.processingStart - entry.startTime;
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // CLS (Cumulative Layout Shift) 측정
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      metricsRef.current.cumulativeLayoutShift = clsValue;
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // FCP (First Contentful Paint) 측정
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          metricsRef.current.firstContentfulPaint = entry.startTime;
        }
      });
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, []);

  // 메모리 사용량 측정
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metricsRef.current.memoryUsage = memory.usedJSHeapSize;
    }
  }, []);

  // 네트워크 정보 수집
  const collectNetworkInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metricsRef.current.connectionType = connection.effectiveType;
    }
  }, []);

  // 페이지 로드 시간 측정
  const measurePageLoadTime = useCallback(() => {
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      metricsRef.current.pageLoadTime = loadTime;
    }
  }, []);

  // 성능 데이터 전송
  const sendPerformanceData = useCallback(async (metrics: PerformanceMetrics) => {
    try {
      // 성능 데이터를 서버로 전송 (실제 구현에서는 적절한 엔드포인트 사용)
      await fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metrics,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send performance data:', error);
    }
  }, []);

  // 성능 점수 계산
  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;

    // LCP 점수 (2.5초 이하 = 좋음)
    if (metrics.largestContentfulPaint > 4000) score -= 30;
    else if (metrics.largestContentfulPaint > 2500) score -= 15;

    // FID 점수 (100ms 이하 = 좋음)
    if (metrics.firstInputDelay > 300) score -= 25;
    else if (metrics.firstInputDelay > 100) score -= 10;

    // CLS 점수 (0.1 이하 = 좋음)
    if (metrics.cumulativeLayoutShift > 0.25) score -= 25;
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 10;

    // FCP 점수 (1.8초 이하 = 좋음)
    if (metrics.firstContentfulPaint > 3000) score -= 20;
    else if (metrics.firstContentfulPaint > 1800) score -= 10;

    return Math.max(0, score);
  }, []);

  // 성능 경고 확인
  const checkPerformanceWarnings = useCallback((metrics: PerformanceMetrics) => {
    const warnings: string[] = [];

    if (metrics.largestContentfulPaint > 4000) {
      warnings.push('LCP가 4초를 초과했습니다. 이미지 최적화를 고려해보세요.');
    }

    if (metrics.firstInputDelay > 300) {
      warnings.push('FID가 300ms를 초과했습니다. JavaScript 실행을 최적화해보세요.');
    }

    if (metrics.cumulativeLayoutShift > 0.25) {
      warnings.push('CLS가 0.25를 초과했습니다. 레이아웃 시프트를 줄여보세요.');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) {
      warnings.push('메모리 사용량이 50MB를 초과했습니다.');
    }

    return warnings;
  }, []);

  // 성능 리포트 생성
  const generatePerformanceReport = useCallback(() => {
    const metrics = metricsRef.current;
    const score = calculatePerformanceScore(metrics);
    const warnings = checkPerformanceWarnings(metrics);

    return {
      metrics,
      score,
      warnings,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
      timestamp: Date.now(),
    };
  }, [calculatePerformanceScore, checkPerformanceWarnings]);

  // 초기화
  useEffect(() => {
    const cleanup = collectWebVitals();
    measurePageLoadTime();
    measureMemoryUsage();
    collectNetworkInfo();

    // 페이지 로드 완료 후 성능 데이터 전송
    const timer = setTimeout(() => {
      const report = generatePerformanceReport();
      console.log('Performance Report:', report);
      
      // 성능 데이터 전송 (프로덕션에서만)
      if (process.env.NODE_ENV === 'production') {
        sendPerformanceData(metricsRef.current);
      }
    }, 5000); // 5초 후 전송

    return () => {
      cleanup?.();
      clearTimeout(timer);
    };
  }, [collectWebVitals, measurePageLoadTime, measureMemoryUsage, collectNetworkInfo, generatePerformanceReport, sendPerformanceData]);

  return {
    getMetrics: () => metricsRef.current,
    generateReport: generatePerformanceReport,
    measureMemory: measureMemoryUsage,
  };
}

// 리소스 모니터링 훅
export function useResourceMonitor() {
  const resourceTimingsRef = useRef<PerformanceResourceTiming[]>([]);

  // 리소스 타이밍 수집
  const collectResourceTimings = useCallback(() => {
    if (!performance.getEntriesByType) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resourceTimingsRef.current = resources;

    // 느린 리소스 식별
    const slowResources = resources.filter(resource => 
      resource.duration > 1000 // 1초 이상
    );

    if (slowResources.length > 0) {
      console.warn('Slow resources detected:', slowResources.map(r => ({
        name: r.name,
        duration: r.duration,
        size: r.transferSize,
      })));
    }
  }, []);

  // 리소스 분석
  const analyzeResources = useCallback(() => {
    const resources = resourceTimingsRef.current;
    
    const analysis = {
      totalResources: resources.length,
      totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      avgLoadTime: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length,
      slowResources: resources.filter(r => r.duration > 1000).length,
      largestResource: resources.reduce((largest, r) => 
        (r.transferSize || 0) > (largest.transferSize || 0) ? r : largest, resources[0]
      ),
      resourceTypes: resources.reduce((types, r) => {
        const type = r.initiatorType || 'other';
        types[type] = (types[type] || 0) + 1;
        return types;
      }, {} as Record<string, number>),
    };

    return analysis;
  }, []);

  useEffect(() => {
    // 페이지 로드 완료 후 리소스 분석
    const timer = setTimeout(collectResourceTimings, 3000);
    return () => clearTimeout(timer);
  }, [collectResourceTimings]);

  return {
    getResourceTimings: () => resourceTimingsRef.current,
    analyzeResources,
  };
}

// 에러 모니터링 훅
export function useErrorMonitor() {
  const errorsRef = useRef<Array<{ error: Error; timestamp: number; context?: string }>>([]);

  // 에러 기록
  const logError = useCallback((error: Error, context?: string) => {
    errorsRef.current.push({
      error,
      timestamp: Date.now(),
      context,
    });

    // 에러 리포팅 (실제 구현에서는 Sentry 등 사용)
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }, []);

  // 전역 에러 핸들러 설정
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logError(new Error(event.message), 'Global Error Handler');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError(new Error(event.reason), 'Unhandled Promise Rejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logError]);

  return {
    logError,
    getErrors: () => errorsRef.current,
    clearErrors: () => { errorsRef.current = []; },
  };
}
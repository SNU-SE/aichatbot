import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { logger } from '../utils/logger';

// 활동 추적 옵션
interface ActivityTrackingOptions {
  trackClicks?: boolean;
  trackScrolls?: boolean;
  trackFormInteractions?: boolean;
  trackTimeOnPage?: boolean;
  trackChatInteractions?: boolean;
  trackFileUploads?: boolean;
}

// 사용자 활동 로깅 훅
export function useActivityLogger(options: ActivityTrackingOptions = {}) {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const interactionCountRef = useRef<number>(0);

  const {
    trackClicks = true,
    trackScrolls = true,
    trackFormInteractions = true,
    trackTimeOnPage = true,
    trackChatInteractions = true,
    trackFileUploads = true,
  } = options;

  // 사용자 ID 설정
  useEffect(() => {
    if (user?.id) {
      logger.setUserId(user.id);
    }
  }, [user?.id]);

  // 클릭 이벤트 추적
  const trackClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const className = target.className;
    const id = target.id;
    const text = target.textContent?.slice(0, 100) || '';

    logger.userAction('click', {
      tagName,
      className,
      id,
      text,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now(),
    });

    interactionCountRef.current++;
  }, []);

  // 스크롤 이벤트 추적
  const trackScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = Math.round((scrollTop / documentHeight) * 100);

    if (scrollPercentage > scrollDepthRef.current) {
      scrollDepthRef.current = scrollPercentage;
      
      // 25%, 50%, 75%, 100% 지점에서 로깅
      if (scrollPercentage >= 25 && scrollPercentage % 25 === 0) {
        logger.userAction('scroll_depth', {
          percentage: scrollPercentage,
          timestamp: Date.now(),
        });
      }
    }
  }, []);

  // 폼 상호작용 추적
  const trackFormInteraction = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    const type = target.type;
    const name = target.name;
    const value = target.type === 'password' ? '[REDACTED]' : target.value?.slice(0, 100);

    logger.userAction('form_interaction', {
      eventType: event.type,
      inputType: type,
      inputName: name,
      valueLength: target.value?.length || 0,
      value: type === 'password' ? '[REDACTED]' : value,
      timestamp: Date.now(),
    });
  }, []);

  // 채팅 상호작용 추적
  const logChatInteraction = useCallback((action: string, data?: Record<string, any>) => {
    logger.education('chat_interaction', {
      action,
      ...data,
      timestamp: Date.now(),
    });
  }, []);

  // 파일 업로드 추적
  const logFileUpload = useCallback((fileName: string, fileSize: number, fileType: string, success: boolean) => {
    logger.userAction('file_upload', {
      fileName,
      fileSize,
      fileType,
      success,
      timestamp: Date.now(),
    });
  }, []);

  // 학습 활동 추적
  const logLearningActivity = useCallback((activity: string, data?: Record<string, any>) => {
    logger.education('learning_activity', {
      activity,
      ...data,
      timestamp: Date.now(),
    });
  }, []);

  // 체크리스트 완료 추적
  const logChecklistCompletion = useCallback((checklistId: string, activityId: string, completed: boolean) => {
    logger.education('checklist_completion', {
      checklistId,
      activityId,
      completed,
      timestamp: Date.now(),
    });
  }, []);

  // 논증문 작성 추적
  const logArgumentationProgress = useCallback((activityId: string, wordCount: number, action: 'draft' | 'submit') => {
    logger.education('argumentation_progress', {
      activityId,
      wordCount,
      action,
      timestamp: Date.now(),
    });
  }, []);

  // 동료평가 추적
  const logPeerEvaluation = useCallback((evaluationId: string, activityId: string, action: 'start' | 'complete') => {
    logger.education('peer_evaluation', {
      evaluationId,
      activityId,
      action,
      timestamp: Date.now(),
    });
  }, []);

  // 페이지 방문 추적
  const logPageVisit = useCallback((pageName: string, additionalData?: Record<string, any>) => {
    logger.userAction('page_visit', {
      pageName,
      url: window.location.href,
      referrer: document.referrer,
      ...additionalData,
      timestamp: Date.now(),
    });
  }, []);

  // 세션 요약 추적
  const logSessionSummary = useCallback(() => {
    const sessionDuration = Date.now() - startTimeRef.current;
    
    logger.userAction('session_summary', {
      duration: sessionDuration,
      interactionCount: interactionCountRef.current,
      maxScrollDepth: scrollDepthRef.current,
      timestamp: Date.now(),
    });
  }, []);

  // 이벤트 리스너 설정
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    if (trackClicks) {
      document.addEventListener('click', trackClick);
      cleanupFunctions.push(() => document.removeEventListener('click', trackClick));
    }

    if (trackScrolls) {
      const throttledScroll = throttle(trackScroll, 1000);
      window.addEventListener('scroll', throttledScroll);
      cleanupFunctions.push(() => window.removeEventListener('scroll', throttledScroll));
    }

    if (trackFormInteractions) {
      const formEvents = ['focus', 'blur', 'change'];
      formEvents.forEach(eventType => {
        document.addEventListener(eventType, trackFormInteraction, true);
        cleanupFunctions.push(() => 
          document.removeEventListener(eventType, trackFormInteraction, true)
        );
      });
    }

    if (trackTimeOnPage) {
      const interval = setInterval(() => {
        logger.userAction('time_on_page', {
          duration: Date.now() - startTimeRef.current,
          timestamp: Date.now(),
        });
      }, 60000); // 매 분마다

      cleanupFunctions.push(() => clearInterval(interval));
    }

    // 페이지 언로드 시 세션 요약
    const handleBeforeUnload = () => {
      logSessionSummary();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    cleanupFunctions.push(() => window.removeEventListener('beforeunload', handleBeforeUnload));

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [trackClicks, trackScrolls, trackFormInteractions, trackTimeOnPage, trackClick, trackScroll, trackFormInteraction, logSessionSummary]);

  return {
    logChatInteraction,
    logFileUpload,
    logLearningActivity,
    logChecklistCompletion,
    logArgumentationProgress,
    logPeerEvaluation,
    logPageVisit,
    logSessionSummary,
  };
}

// 스로틀 유틸리티 함수
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

// 에러 경계에서 사용할 에러 로깅
export function useErrorLogger() {
  const logError = useCallback((error: Error, errorInfo?: any) => {
    logger.error('COMPONENT_ERROR', error.message, error, {
      componentStack: errorInfo?.componentStack,
      errorBoundary: true,
      timestamp: Date.now(),
    });
  }, []);

  return { logError };
}

// API 호출 로깅
export function useApiLogger() {
  const logApiCall = useCallback((
    method: string,
    url: string,
    startTime: number,
    status: number,
    data?: Record<string, any>
  ) => {
    const duration = Date.now() - startTime;
    logger.apiCall(method, url, duration, status, data);
  }, []);

  const logApiError = useCallback((
    method: string,
    url: string,
    error: Error,
    data?: Record<string, any>
  ) => {
    logger.error('API_ERROR', `${method} ${url} failed: ${error.message}`, error, data);
  }, []);

  return { logApiCall, logApiError };
}
import { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    <span className="ml-2 text-gray-600">로딩 중...</span>
  </div>
);

// 에러 폴백 컴포넌트
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-500 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">컴포넌트 로딩 오류</h3>
    <p className="text-gray-600 mb-4">컴포넌트를 불러오는 중 오류가 발생했습니다.</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
    >
      다시 시도
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 text-left">
        <summary className="cursor-pointer text-sm text-gray-500">에러 상세</summary>
        <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
          {error.message}
        </pre>
      </details>
    )}
  </div>
);

// 지연 로딩 래퍼 컴포넌트
interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<any>;
}

export const LazyLoader = ({ 
  children, 
  fallback: Fallback = LoadingSpinner,
  errorFallback: ErrorFallbackComponent = ErrorFallback 
}: LazyLoaderProps) => (
  <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
    <Suspense fallback={<Fallback />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// HOC for lazy loading components
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ComponentType,
  errorFallback?: React.ComponentType<any>
) {
  return (props: P) => (
    <LazyLoader fallback={fallback} errorFallback={errorFallback}>
      <Component {...props} />
    </LazyLoader>
  );
}

// 지연 로딩된 페이지 컴포넌트들
export const LazyAdminDashboard = lazy(() => import('../../pages/AdminDashboard'));
export const LazyStudentDashboard = lazy(() => import('../../pages/StudentDashboard'));
export const LazyStudentActivityPage = lazy(() => import('../../pages/StudentActivityPage'));
export const LazyStudentChatPage = lazy(() => import('../../pages/StudentChatPage'));
export const LazyStudentHistoryPage = lazy(() => import('../../pages/StudentHistoryPage'));
export const LazyStudentProfilePage = lazy(() => import('../../pages/StudentProfilePage'));

// 관리자 페이지들
export const LazyStudentsManagePage = lazy(() => import('../../pages/admin/StudentsManagePage'));
export const LazyActivitiesManagePage = lazy(() => import('../../pages/admin/ActivitiesManagePage'));
export const LazyChatMonitoringPage = lazy(() => import('../../pages/admin/ChatMonitoringPage'));
export const LazyFileManagePage = lazy(() => import('../../pages/admin/FileManagePage'));
export const LazyAISettingsPage = lazy(() => import('../../pages/admin/AISettingsPage'));

// 지연 로딩된 컴포넌트들
export const LazyRealTimeMonitor = lazy(() => import('../admin/RealTimeMonitor'));
export const LazyFileManager = lazy(() => import('../admin/FileManager'));
export const LazyStorageMonitor = lazy(() => import('../admin/StorageMonitor'));
export const LazyArgumentationEditor = lazy(() => import('../student/ArgumentationEditor'));
export const LazyPeerEvaluation = lazy(() => import('../student/PeerEvaluation'));
export const LazyStreamingChatInterface = lazy(() => import('../student/StreamingChatInterface'));
export const LazyEnhancedFileUpload = lazy(() => import('../student/EnhancedFileUpload'));

// 프리로딩 유틸리티
export const preloadComponent = (componentImport: () => Promise<any>) => {
  const componentImportWrapper = () => componentImport();
  
  // 마우스 오버 시 프리로드
  const preloadOnHover = (element: HTMLElement) => {
    const handleMouseEnter = () => {
      componentImportWrapper();
      element.removeEventListener('mouseenter', handleMouseEnter);
    };
    element.addEventListener('mouseenter', handleMouseEnter);
  };

  // 뷰포트에 들어올 때 프리로드
  const preloadOnIntersection = (element: HTMLElement) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            componentImportWrapper();
            observer.unobserve(element);
          }
        });
      },
      { rootMargin: '100px' }
    );
    observer.observe(element);
  };

  return { preloadOnHover, preloadOnIntersection };
};

// 라우트 기반 프리로딩
export const routePreloader = {
  // 관리자 대시보드 접근 시 관련 컴포넌트들 프리로드
  preloadAdminComponents: () => {
    import('../../pages/admin/StudentsManagePage');
    import('../../pages/admin/ActivitiesManagePage');
    import('../../components/admin/RealTimeMonitor');
  },

  // 학생 대시보드 접근 시 관련 컴포넌트들 프리로드
  preloadStudentComponents: () => {
    import('../../pages/StudentActivityPage');
    import('../../pages/StudentChatPage');
    import('../../components/student/StreamingChatInterface');
  },

  // 활동 페이지 접근 시 관련 컴포넌트들 프리로드
  preloadActivityComponents: () => {
    import('../../components/student/ArgumentationEditor');
    import('../../components/student/PeerEvaluation');
    import('../../components/student/EnhancedFileUpload');
  },
};

// 조건부 로딩 (사용자 역할에 따라)
export const ConditionalLoader = ({ 
  condition, 
  component: Component, 
  fallback: Fallback = LoadingSpinner 
}: {
  condition: boolean;
  component: React.ComponentType;
  fallback?: React.ComponentType;
}) => {
  if (!condition) {
    return <Fallback />;
  }

  return (
    <LazyLoader fallback={Fallback}>
      <Component />
    </LazyLoader>
  );
};

// 네트워크 상태에 따른 로딩 최적화
export const NetworkAwareLoader = ({ 
  children, 
  lowBandwidthFallback 
}: {
  children: React.ReactNode;
  lowBandwidthFallback?: React.ComponentType;
}) => {
  // 네트워크 상태 감지 (실험적 API)
  const connection = (navigator as any).connection;
  const isSlowConnection = connection && (
    connection.effectiveType === 'slow-2g' || 
    connection.effectiveType === '2g' ||
    connection.saveData
  );

  if (isSlowConnection && lowBandwidthFallback) {
    const LowBandwidthComponent = lowBandwidthFallback;
    return <LowBandwidthComponent />;
  }

  return <>{children}</>;
};
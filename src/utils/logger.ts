// 로깅 레벨 정의
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 로그 이벤트 타입
export interface LogEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

// 로그 전송 인터페이스
interface LogTransport {
  send(event: LogEvent): Promise<void>;
}

// 콘솔 로그 전송
class ConsoleTransport implements LogTransport {
  async send(event: LogEvent): Promise<void> {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelName = levelNames[event.level];
    const timestamp = new Date(event.timestamp).toISOString();
    
    const logMessage = `[${timestamp}] ${levelName} [${event.category}] ${event.message}`;
    
    switch (event.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, event.data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, event.data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, event.data);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, event.data, event.stack);
        break;
    }
  }
}

// Supabase 로그 전송
class SupabaseTransport implements LogTransport {
  async send(event: LogEvent): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabase');
      
      await supabase.from('application_logs').insert({
        id: event.id,
        timestamp: event.timestamp,
        level: event.level,
        category: event.category,
        message: event.message,
        data: event.data,
        user_id: event.userId,
        session_id: event.sessionId,
        user_agent: event.userAgent,
        url: event.url,
        stack: event.stack,
      });
    } catch (error) {
      console.error('Failed to send log to Supabase:', error);
    }
  }
}

// 외부 서비스 로그 전송 (예: Sentry, LogRocket 등)
class ExternalTransport implements LogTransport {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async send(event: LogEvent): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }
}

// 메인 로거 클래스
class Logger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupTransports();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupTransports(): void {
    // 개발 환경에서는 콘솔 로그
    if (process.env.NODE_ENV === 'development') {
      this.transports.push(new ConsoleTransport());
      this.minLevel = LogLevel.DEBUG;
    }

    // 프로덕션 환경에서는 Supabase와 외부 서비스
    if (process.env.NODE_ENV === 'production') {
      this.transports.push(new SupabaseTransport());
      
      // 외부 로깅 서비스 (선택사항)
      const externalEndpoint = process.env.VITE_LOGGING_ENDPOINT;
      if (externalEndpoint) {
        this.transports.push(new ExternalTransport(externalEndpoint));
      }
      
      this.minLevel = LogLevel.INFO;
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private async log(level: LogLevel, category: string, message: string, data?: Record<string, any>, error?: Error): Promise<void> {
    if (level < this.minLevel) return;

    const event: LogEvent = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error?.stack,
    };

    // 모든 전송 방식에 병렬로 전송
    await Promise.allSettled(
      this.transports.map(transport => transport.send(event))
    );
  }

  debug(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, error?: Error, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  // 특화된 로깅 메서드들
  userAction(action: string, data?: Record<string, any>): void {
    this.info('USER_ACTION', `User performed action: ${action}`, {
      action,
      ...data,
    });
  }

  apiCall(method: string, url: string, duration: number, status: number, data?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, 'API_CALL', `${method} ${url} - ${status} (${duration}ms)`, {
      method,
      url,
      duration,
      status,
      ...data,
    });
  }

  performance(metric: string, value: number, data?: Record<string, any>): void {
    this.info('PERFORMANCE', `${metric}: ${value}`, {
      metric,
      value,
      ...data,
    });
  }

  security(event: string, data?: Record<string, any>): void {
    this.warn('SECURITY', `Security event: ${event}`, {
      event,
      ...data,
    });
  }

  education(event: string, data?: Record<string, any>): void {
    this.info('EDUCATION', `Education event: ${event}`, {
      event,
      ...data,
    });
  }
}

// 전역 로거 인스턴스
export const logger = new Logger();

// 전역 에러 핸들러 설정
window.addEventListener('error', (event) => {
  logger.error('GLOBAL_ERROR', 'Uncaught error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('UNHANDLED_REJECTION', 'Unhandled promise rejection', event.reason, {
    reason: event.reason,
  });
});

// 페이지 가시성 변경 추적
document.addEventListener('visibilitychange', () => {
  logger.userAction('page_visibility_change', {
    visibility: document.visibilityState,
  });
});

// 페이지 언로드 추적
window.addEventListener('beforeunload', () => {
  logger.userAction('page_unload', {
    url: window.location.href,
    duration: Date.now() - performance.timing.navigationStart,
  });
});

export default logger;
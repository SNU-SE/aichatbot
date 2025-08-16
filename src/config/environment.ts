// 환경별 설정 관리
export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    baseUrl: string;
    apiTimeout: number;
  };
  features: {
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
    enableDebugMode: boolean;
  };
  limits: {
    maxFileSize: number;
    maxChatHistory: number;
    apiRateLimit: number;
  };
  external: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    loggingEndpoint?: string;
  };
}

// 기본 설정
const defaultConfig: Partial<EnvironmentConfig> = {
  app: {
    name: 'AI 교육 플랫폼',
    version: __APP_VERSION__ || '1.0.0',
    apiTimeout: 30000,
  },
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxChatHistory: 100,
    apiRateLimit: 100,
  },
};

// 개발 환경 설정
const developmentConfig: EnvironmentConfig = {
  ...defaultConfig,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  app: {
    ...defaultConfig.app!,
    environment: 'development',
    baseUrl: 'http://localhost:5173',
  },
  features: {
    enableAnalytics: false,
    enableErrorReporting: false,
    enablePerformanceMonitoring: true,
    enableDebugMode: true,
  },
  external: {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
};

// 스테이징 환경 설정
const stagingConfig: EnvironmentConfig = {
  ...defaultConfig,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  app: {
    ...defaultConfig.app!,
    environment: 'staging',
    baseUrl: import.meta.env.VITE_APP_BASE_URL || '',
  },
  features: {
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
    enableDebugMode: false,
  },
  external: {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    loggingEndpoint: import.meta.env.VITE_LOGGING_ENDPOINT,
  },
};

// 프로덕션 환경 설정
const productionConfig: EnvironmentConfig = {
  ...defaultConfig,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  app: {
    ...defaultConfig.app!,
    environment: 'production',
    baseUrl: import.meta.env.VITE_APP_BASE_URL || '',
  },
  features: {
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
    enableDebugMode: false,
  },
  external: {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    loggingEndpoint: import.meta.env.VITE_LOGGING_ENDPOINT,
  },
};

// 현재 환경 감지
function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

// 환경별 설정 선택
function getEnvironmentConfig(): EnvironmentConfig {
  const environment = getCurrentEnvironment();
  
  switch (environment) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return developmentConfig;
  }
}

// 설정 검증
function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  if (!config.supabase.url) {
    errors.push('Supabase URL is required');
  }

  if (!config.supabase.anonKey) {
    errors.push('Supabase anonymous key is required');
  }

  if (!config.app.baseUrl) {
    errors.push('App base URL is required');
  }

  if (config.app.environment === 'production') {
    if (!config.external.openaiApiKey && !config.external.anthropicApiKey) {
      errors.push('At least one AI API key is required in production');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration validation failed:', errors);
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

// 설정 내보내기
export const config = getEnvironmentConfig();

// 개발 환경에서만 설정 검증
if (config.features.enableDebugMode) {
  console.log('Current environment:', config.app.environment);
  console.log('Configuration:', {
    ...config,
    external: {
      ...config.external,
      openaiApiKey: config.external.openaiApiKey ? '[REDACTED]' : undefined,
      anthropicApiKey: config.external.anthropicApiKey ? '[REDACTED]' : undefined,
    },
  });
}

// 프로덕션에서는 항상 검증
if (config.app.environment === 'production') {
  validateConfig(config);
}

// 유틸리티 함수들
export const isDevelopment = config.app.environment === 'development';
export const isStaging = config.app.environment === 'staging';
export const isProduction = config.app.environment === 'production';

export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']): boolean => {
  return config.features[feature];
};

export const getApiTimeout = (): number => {
  return config.app.apiTimeout;
};

export const getMaxFileSize = (): number => {
  return config.limits.maxFileSize;
};

export const getAppInfo = () => ({
  name: config.app.name,
  version: config.app.version,
  environment: config.app.environment,
  buildTime: __BUILD_TIME__ || new Date().toISOString(),
  commitHash: __COMMIT_HASH__ || 'unknown',
});

// 타입 선언 확장
declare global {
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
  const __COMMIT_HASH__: string;
}
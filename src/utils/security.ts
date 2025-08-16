import DOMPurify from 'dompurify';

// XSS 방지를 위한 HTML 정화 함수
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

// 텍스트 입력 정화 (일반 텍스트)
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim();
}

// SQL 인젝션 방지를 위한 문자열 이스케이프
export function escapeString(str: string): string {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/'/g, "''") // 단일 따옴표 이스케이프
    .replace(/\\/g, '\\\\') // 백슬래시 이스케이프
    .replace(/\x00/g, '\\0') // NULL 바이트 제거
    .replace(/\n/g, '\\n') // 개행 문자 이스케이프
    .replace(/\r/g, '\\r') // 캐리지 리턴 이스케이프
    .replace(/\x1a/g, '\\Z'); // Ctrl+Z 이스케이프
}

// 파일명 정화 (안전한 파일명 생성)
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return 'untitled';
  
  return filename
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_') // 안전한 문자만 허용
    .replace(/_{2,}/g, '_') // 연속된 언더스코어 제거
    .replace(/^_+|_+$/g, '') // 시작/끝 언더스코어 제거
    .substring(0, 255); // 길이 제한
}

// 입력 검증 함수들
export const validators = {
  // 이메일 검증
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  // 비밀번호 검증 (최소 8자, 대소문자, 숫자, 특수문자 포함)
  password: (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password) && password.length <= 128;
  },

  // 이름 검증 (한글, 영문, 공백만 허용)
  name: (name: string): boolean => {
    const nameRegex = /^[가-힣a-zA-Z\s]{1,50}$/;
    return nameRegex.test(name);
  },

  // 클래스명 검증
  className: (className: string): boolean => {
    const classRegex = /^[가-힣a-zA-Z0-9\s-]{1,30}$/;
    return classRegex.test(className);
  },

  // UUID 검증
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // URL 검증
  url: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },

  // 파일 크기 검증 (바이트 단위)
  fileSize: (size: number, maxSize: number = 10 * 1024 * 1024): boolean => {
    return typeof size === 'number' && size > 0 && size <= maxSize;
  },

  // 파일 타입 검증
  fileType: (type: string, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(type.toLowerCase());
  },

  // 텍스트 길이 검증
  textLength: (text: string, minLength: number = 0, maxLength: number = 1000): boolean => {
    return typeof text === 'string' && 
           text.length >= minLength && 
           text.length <= maxLength;
  },

  // 숫자 범위 검증
  numberRange: (num: number, min: number = 0, max: number = 100): boolean => {
    return typeof num === 'number' && 
           !isNaN(num) && 
           num >= min && 
           num <= max;
  },
};

// 입력 데이터 검증 스키마
export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    validator: (value: any) => boolean;
    message: string;
  };
}

// 데이터 검증 함수
export function validateData(data: Record<string, any>, schema: ValidationSchema): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // 필수 필드 검증
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field}는 필수 입력 항목입니다.`;
      continue;
    }

    // 값이 있을 때만 검증
    if (value !== undefined && value !== null && value !== '') {
      if (!rules.validator(value)) {
        errors[field] = rules.message;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// 일반적인 검증 스키마들
export const commonSchemas = {
  // 학생 등록 스키마
  studentRegistration: {
    name: {
      required: true,
      validator: validators.name,
      message: '이름은 한글 또는 영문으로 1-50자 이내여야 합니다.',
    },
    email: {
      required: true,
      validator: validators.email,
      message: '올바른 이메일 형식이 아닙니다.',
    },
    className: {
      required: false,
      validator: validators.className,
      message: '클래스명은 1-30자 이내여야 합니다.',
    },
  },

  // 활동 생성 스키마
  activityCreation: {
    title: {
      required: true,
      validator: (value: string) => validators.textLength(value, 1, 100),
      message: '제목은 1-100자 이내여야 합니다.',
    },
    description: {
      required: false,
      validator: (value: string) => validators.textLength(value, 0, 1000),
      message: '설명은 1000자 이내여야 합니다.',
    },
    type: {
      required: true,
      validator: (value: string) => ['discussion', 'argumentation', 'experiment'].includes(value),
      message: '올바른 활동 타입을 선택해주세요.',
    },
  },

  // 채팅 메시지 스키마
  chatMessage: {
    message: {
      required: true,
      validator: (value: string) => validators.textLength(value, 1, 2000),
      message: '메시지는 1-2000자 이내여야 합니다.',
    },
    studentId: {
      required: true,
      validator: validators.uuid,
      message: '올바른 학생 ID가 아닙니다.',
    },
    activityId: {
      required: false,
      validator: validators.uuid,
      message: '올바른 활동 ID가 아닙니다.',
    },
  },

  // 파일 업로드 스키마
  fileUpload: {
    file: {
      required: true,
      validator: (file: File) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
        return validators.fileSize(file.size, 10 * 1024 * 1024) && 
               validators.fileType(file.type, allowedTypes);
      },
      message: '파일은 PDF, JPEG, PNG, TXT 형식이며 10MB 이하여야 합니다.',
    },
  },
};

// CSRF 토큰 생성 및 검증
export const csrfProtection = {
  // CSRF 토큰 생성
  generateToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // CSRF 토큰 저장
  setToken: (token: string): void => {
    sessionStorage.setItem('csrf_token', token);
  },

  // CSRF 토큰 가져오기
  getToken: (): string | null => {
    return sessionStorage.getItem('csrf_token');
  },

  // CSRF 토큰 검증
  validateToken: (token: string): boolean => {
    const storedToken = csrfProtection.getToken();
    return storedToken !== null && storedToken === token;
  },
};

// 콘텐츠 보안 정책 (CSP) 헤더 생성
export function generateCSPHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
}

// 보안 헤더 설정
export const securityHeaders = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// 민감한 데이터 마스킹
export function maskSensitiveData(data: string, type: 'email' | 'phone' | 'id'): string {
  switch (type) {
    case 'email':
      const [username, domain] = data.split('@');
      if (username.length <= 2) return data;
      return `${username.substring(0, 2)}***@${domain}`;
    
    case 'phone':
      if (data.length <= 4) return data;
      return `${data.substring(0, 3)}****${data.substring(data.length - 4)}`;
    
    case 'id':
      if (data.length <= 4) return '****';
      return `${data.substring(0, 2)}****${data.substring(data.length - 2)}`;
    
    default:
      return data;
  }
}

// 로그 정화 (민감한 정보 제거)
export function sanitizeLogData(data: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  return data;
}
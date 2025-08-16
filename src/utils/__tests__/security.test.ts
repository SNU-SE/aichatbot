import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  escapeString,
  sanitizeFilename,
  validators,
  validateData,
  commonSchemas,
  csrfProtection,
  maskSensitiveData,
  sanitizeLogData,
} from '../security';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html.replace(/<script[^>]*>.*?<\/script>/gi, '')),
  },
}));

describe('Security Utils', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeText(input);
      expect(result).toBe('Hello  World');
    });

    it('should remove JavaScript protocols', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeText(input);
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")';
      const result = sanitizeText(input);
      expect(result).toBe('alert("xss")');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
      expect(sanitizeText(123 as any)).toBe('');
    });
  });

  describe('escapeString', () => {
    it('should escape single quotes', () => {
      const input = "It's a test";
      const result = escapeString(input);
      expect(result).toBe("It''s a test");
    });

    it('should escape backslashes', () => {
      const input = 'C:\\Users\\test';
      const result = escapeString(input);
      expect(result).toBe('C:\\\\Users\\\\test');
    });

    it('should handle special characters', () => {
      const input = '\n\r\x00\x1a';
      const result = escapeString(input);
      expect(result).toBe('\\n\\r\\0\\Z');
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace unsafe characters with underscores', () => {
      const input = 'file<>:"/\\|?*.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('file_.txt');
    });

    it('should preserve safe characters', () => {
      const input = 'test-file_123.한글.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('test-file_123.한글.txt');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(300);
      const result = sanitizeFilename(input);
      expect(result.length).toBe(255);
    });

    it('should handle non-string input', () => {
      expect(sanitizeFilename(null as any)).toBe('untitled');
      expect(sanitizeFilename(undefined as any)).toBe('untitled');
    });
  });

  describe('validators', () => {
    describe('email', () => {
      it('should validate correct email', () => {
        expect(validators.email('test@example.com')).toBe(true);
        expect(validators.email('user.name+tag@domain.co.kr')).toBe(true);
      });

      it('should reject invalid email', () => {
        expect(validators.email('invalid-email')).toBe(false);
        expect(validators.email('test@')).toBe(false);
        expect(validators.email('@example.com')).toBe(false);
      });

      it('should reject too long email', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        expect(validators.email(longEmail)).toBe(false);
      });
    });

    describe('password', () => {
      it('should validate strong password', () => {
        expect(validators.password('StrongP@ss123')).toBe(true);
        expect(validators.password('MySecure!Pass1')).toBe(true);
      });

      it('should reject weak password', () => {
        expect(validators.password('weak')).toBe(false);
        expect(validators.password('onlylowercase')).toBe(false);
        expect(validators.password('ONLYUPPERCASE')).toBe(false);
        expect(validators.password('NoNumbers!')).toBe(false);
        expect(validators.password('NoSpecialChars123')).toBe(false);
      });
    });

    describe('name', () => {
      it('should validate Korean and English names', () => {
        expect(validators.name('홍길동')).toBe(true);
        expect(validators.name('John Doe')).toBe(true);
        expect(validators.name('김 철수')).toBe(true);
      });

      it('should reject invalid names', () => {
        expect(validators.name('Name123')).toBe(false);
        expect(validators.name('Name@')).toBe(false);
        expect(validators.name('')).toBe(false);
        expect(validators.name('a'.repeat(51))).toBe(false);
      });
    });

    describe('uuid', () => {
      it('should validate correct UUID', () => {
        expect(validators.uuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(validators.uuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should reject invalid UUID', () => {
        expect(validators.uuid('invalid-uuid')).toBe(false);
        expect(validators.uuid('123e4567-e89b-12d3-a456')).toBe(false);
        expect(validators.uuid('')).toBe(false);
      });
    });

    describe('fileSize', () => {
      it('should validate file size within limit', () => {
        expect(validators.fileSize(1024)).toBe(true);
        expect(validators.fileSize(5 * 1024 * 1024)).toBe(true);
      });

      it('should reject oversized files', () => {
        expect(validators.fileSize(20 * 1024 * 1024)).toBe(false);
        expect(validators.fileSize(0)).toBe(false);
        expect(validators.fileSize(-1)).toBe(false);
      });
    });
  });

  describe('validateData', () => {
    it('should validate data against schema', () => {
      const data = {
        name: '홍길동',
        email: 'test@example.com',
      };

      const result = validateData(data, commonSchemas.studentRegistration);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return errors for invalid data', () => {
      const data = {
        name: '',
        email: 'invalid-email',
      };

      const result = validateData(data, commonSchemas.studentRegistration);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });

    it('should handle missing required fields', () => {
      const data = {};

      const result = validateData(data, commonSchemas.studentRegistration);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('필수 입력');
      expect(result.errors.email).toContain('필수 입력');
    });
  });

  describe('csrfProtection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should generate CSRF token', () => {
      const token = csrfProtection.generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should set and get CSRF token', () => {
      const token = 'test-csrf-token';
      csrfProtection.setToken(token);
      expect(csrfProtection.getToken()).toBe(token);
    });

    it('should validate CSRF token', () => {
      const token = 'test-csrf-token';
      csrfProtection.setToken(token);
      expect(csrfProtection.validateToken(token)).toBe(true);
      expect(csrfProtection.validateToken('wrong-token')).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask email addresses', () => {
      expect(maskSensitiveData('test@example.com', 'email')).toBe('te***@example.com');
      expect(maskSensitiveData('a@example.com', 'email')).toBe('a@example.com');
    });

    it('should mask phone numbers', () => {
      expect(maskSensitiveData('01012345678', 'phone')).toBe('010****5678');
      expect(maskSensitiveData('123', 'phone')).toBe('123');
    });

    it('should mask IDs', () => {
      expect(maskSensitiveData('user123456', 'id')).toBe('us****56');
      expect(maskSensitiveData('abc', 'id')).toBe('****');
    });
  });

  describe('sanitizeLogData', () => {
    it('should redact sensitive fields', () => {
      const data = {
        username: 'test',
        password: 'secret123',
        token: 'abc123',
        normalField: 'value',
      };

      const result = sanitizeLogData(data);
      expect(result.username).toBe('test');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.normalField).toBe('value');
    });

    it('should handle non-object input', () => {
      expect(sanitizeLogData('string')).toBe('string');
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(null)).toBe(null);
    });
  });
});
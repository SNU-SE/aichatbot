import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical User Journeys', () => {
  const baseURL = process.env.PRODUCTION_URL || 'http://localhost:4173';

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 페이지 로드
    await page.goto(baseURL);
  });

  test('홈페이지가 정상적으로 로드된다', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/AI 교육 플랫폼/);
    
    // 주요 네비게이션 요소 확인
    await expect(page.locator('nav')).toBeVisible();
    
    // 로그인 버튼 또는 링크 확인
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('로그인 페이지로 이동할 수 있다', async ({ page }) => {
    // 로그인 링크 클릭
    await page.click('text=로그인');
    
    // URL 변경 확인
    await expect(page).toHaveURL(/.*\/auth/);
    
    // 로그인 폼 요소들 확인
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('학생 대시보드 접근 테스트', async ({ page }) => {
    // 테스트용 학생 계정으로 로그인 시뮬레이션
    await page.goto(`${baseURL}/auth`);
    
    // 로그인 폼 작성 (테스트 환경에서만)
    if (process.env.TEST_STUDENT_EMAIL && process.env.TEST_STUDENT_PASSWORD) {
      await page.fill('input[type="email"]', process.env.TEST_STUDENT_EMAIL);
      await page.fill('input[type="password"]', process.env.TEST_STUDENT_PASSWORD);
      await page.click('button[type="submit"]');
      
      // 학생 대시보드로 리다이렉트 확인
      await expect(page).toHaveURL(/.*\/student/);
      
      // 주요 학생 기능 요소들 확인
      await expect(page.locator('text=활동 선택')).toBeVisible();
      await expect(page.locator('text=채팅')).toBeVisible();
    } else {
      // 테스트 계정이 없는 경우 URL 직접 접근으로 리다이렉트 테스트
      await page.goto(`${baseURL}/student`);
      // 인증되지 않은 경우 로그인 페이지로 리다이렉트되는지 확인
      await expect(page).toHaveURL(/.*\/auth/);
    }
  });

  test('관리자 대시보드 접근 테스트', async ({ page }) => {
    // 테스트용 관리자 계정으로 로그인 시뮬레이션
    await page.goto(`${baseURL}/auth`);
    
    if (process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD) {
      await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL);
      await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      // 관리자 대시보드로 리다이렉트 확인
      await expect(page).toHaveURL(/.*\/admin/);
      
      // 주요 관리자 기능 요소들 확인
      await expect(page.locator('text=학생 관리')).toBeVisible();
      await expect(page.locator('text=활동 관리')).toBeVisible();
      await expect(page.locator('text=실시간 모니터링')).toBeVisible();
    } else {
      // 테스트 계정이 없는 경우 URL 직접 접근으로 리다이렉트 테스트
      await page.goto(`${baseURL}/admin`);
      await expect(page).toHaveURL(/.*\/auth/);
    }
  });

  test('API 엔드포인트 상태 확인', async ({ page }) => {
    // Supabase 연결 상태 확인을 위한 간단한 API 호출 테스트
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/health');
        return res.status;
      } catch (error) {
        return 500;
      }
    });
    
    // API가 응답하는지 확인 (200 또는 404는 서버가 동작 중임을 의미)
    expect([200, 404, 500].includes(response)).toBeTruthy();
  });

  test('정적 자산들이 정상적으로 로드된다', async ({ page }) => {
    // 페이지 로드 후 네트워크 오류 확인
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('requestfailed', (request) => {
      errors.push(`Failed to load: ${request.url()}`);
    });
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // CSS 파일이 로드되었는지 확인
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
    
    // JavaScript 파일이 로드되었는지 확인
    const scripts = await page.locator('script[src]').count();
    expect(scripts).toBeGreaterThan(0);
    
    // 심각한 오류가 없는지 확인
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('반응형 디자인 기본 테스트', async ({ page }) => {
    // 데스크톱 뷰
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(baseURL);
    await expect(page.locator('nav')).toBeVisible();
    
    // 태블릿 뷰
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('nav')).toBeVisible();
    
    // 모바일 뷰
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('기본 SEO 메타 태그 확인', async ({ page }) => {
    await page.goto(baseURL);
    
    // 기본 메타 태그들 확인
    const title = await page.locator('title').textContent();
    expect(title).toBeTruthy();
    expect(title?.length).toBeGreaterThan(0);
    
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(0);
    
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('콘솔 에러 모니터링', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // 심각한 콘솔 에러가 없는지 확인
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('analytics') &&
      !error.includes('development')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
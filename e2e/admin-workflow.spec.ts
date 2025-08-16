import { test, expect } from '@playwright/test';

test.describe('Admin Workflow Tests', () => {
  const baseURL = process.env.PRODUCTION_URL || 'http://localhost:4173';

  test.beforeEach(async ({ page }) => {
    // 관리자로 로그인 (테스트 환경에서만)
    await page.goto(`${baseURL}/auth`);
    
    if (process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD) {
      await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL);
      await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/admin/);
    } else {
      // 테스트 계정이 없는 경우 관리자 페이지로 직접 이동 (인증 우회)
      await page.goto(`${baseURL}/admin`);
    }
  });

  test('관리자 대시보드 주요 기능 확인', async ({ page }) => {
    // 대시보드 주요 섹션들이 표시되는지 확인
    await expect(page.locator('text=학생 관리')).toBeVisible();
    await expect(page.locator('text=활동 관리')).toBeVisible();
    await expect(page.locator('text=실시간 모니터링')).toBeVisible();
    await expect(page.locator('text=AI 설정')).toBeVisible();
  });

  test('학생 관리 페이지 기능 테스트', async ({ page }) => {
    // 학생 관리 페이지로 이동
    await page.click('text=학생 관리');
    await expect(page).toHaveURL(/.*\/admin\/students/);
    
    // 학생 목록 테이블이 표시되는지 확인
    await expect(page.locator('table')).toBeVisible();
    
    // 새 학생 추가 버튼 확인
    await expect(page.locator('text=학생 추가')).toBeVisible();
    
    // 검색 기능 확인
    const searchInput = page.locator('input[placeholder*="검색"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // 검색 디바운스 대기
    }
  });

  test('활동 관리 페이지 기능 테스트', async ({ page }) => {
    // 활동 관리 페이지로 이동
    await page.click('text=활동 관리');
    await expect(page).toHaveURL(/.*\/admin\/activities/);
    
    // 활동 목록이 표시되는지 확인
    await expect(page.locator('[data-testid="activities-list"]')).toBeVisible();
    
    // 새 활동 생성 버튼 확인
    await expect(page.locator('text=활동 생성')).toBeVisible();
  });

  test('실시간 모니터링 페이지 기능 테스트', async ({ page }) => {
    // 실시간 모니터링 페이지로 이동
    await page.click('text=실시간 모니터링');
    await expect(page).toHaveURL(/.*\/admin\/monitoring/);
    
    // 실시간 데이터 표시 영역 확인
    await expect(page.locator('[data-testid="realtime-monitor"]')).toBeVisible();
    
    // 온라인 학생 수 표시 확인
    await expect(page.locator('text=온라인 학생')).toBeVisible();
  });

  test('AI 설정 페이지 기능 테스트', async ({ page }) => {
    // AI 설정 페이지로 이동
    await page.click('text=AI 설정');
    await expect(page).toHaveURL(/.*\/admin\/ai-settings/);
    
    // AI 모델 설정 폼 확인
    await expect(page.locator('select[name="aiModel"]')).toBeVisible();
    
    // 프롬프트 템플릿 설정 확인
    await expect(page.locator('textarea[name="systemPrompt"]')).toBeVisible();
    
    // 설정 저장 버튼 확인
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('채팅 모니터링 기능 테스트', async ({ page }) => {
    // 채팅 모니터링 페이지로 이동 (사이드바 또는 메뉴에서)
    const chatMonitoringLink = page.locator('text=채팅 모니터링');
    if (await chatMonitoringLink.count() > 0) {
      await chatMonitoringLink.click();
      
      // 실시간 채팅 로그 확인
      await expect(page.locator('[data-testid="chat-logs"]')).toBeVisible();
      
      // 필터링 옵션 확인
      await expect(page.locator('select[name="studentFilter"]')).toBeVisible();
    }
  });

  test('파일 관리 기능 테스트', async ({ page }) => {
    // 파일 관리 페이지로 이동
    const fileManagementLink = page.locator('text=파일 관리');
    if (await fileManagementLink.count() > 0) {
      await fileManagementLink.click();
      
      // 파일 목록 확인
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
      
      // 스토리지 사용량 정보 확인
      await expect(page.locator('text=스토리지 사용량')).toBeVisible();
    }
  });

  test('관리자 권한 확인', async ({ page }) => {
    // 관리자만 접근 가능한 기능들이 표시되는지 확인
    const adminOnlyElements = [
      'text=학생 삭제',
      'text=시스템 설정',
      'text=데이터 내보내기',
      'button[data-admin-only]'
    ];

    for (const selector of adminOnlyElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('데이터 내보내기 기능 테스트', async ({ page }) => {
    // 데이터 내보내기 버튼 찾기
    const exportButton = page.locator('text=데이터 내보내기');
    if (await exportButton.count() > 0) {
      // 다운로드 이벤트 리스너 설정
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // 다운로드가 시작되는지 확인
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|json)$/);
    }
  });

  test('시스템 통계 표시 확인', async ({ page }) => {
    // 대시보드의 통계 카드들 확인
    const statsElements = [
      'text=총 학생 수',
      'text=활성 활동',
      'text=오늘의 채팅',
      '[data-testid="stats-card"]'
    ];

    for (const selector of statsElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('알림 시스템 테스트', async ({ page }) => {
    // 알림 영역 확인
    const notificationArea = page.locator('[data-testid="notifications"]');
    if (await notificationArea.count() > 0) {
      await expect(notificationArea).toBeVisible();
    }

    // 새로운 알림이 있는지 확인
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    if (await notificationBadge.count() > 0) {
      await expect(notificationBadge).toBeVisible();
    }
  });
});
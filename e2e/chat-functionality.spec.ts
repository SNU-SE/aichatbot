import { test, expect } from '@playwright/test';

test.describe('Chat Functionality Tests', () => {
  const baseURL = process.env.PRODUCTION_URL || 'http://localhost:4173';

  test.beforeEach(async ({ page }) => {
    // 학생으로 로그인 후 채팅 페이지로 이동
    await page.goto(`${baseURL}/auth`);
    
    if (process.env.TEST_STUDENT_EMAIL && process.env.TEST_STUDENT_PASSWORD) {
      await page.fill('input[type="email"]', process.env.TEST_STUDENT_EMAIL);
      await page.fill('input[type="password"]', process.env.TEST_STUDENT_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/student/);
      
      // 채팅 페이지로 이동
      await page.click('text=채팅');
      await page.waitForURL(/.*\/student\/chat/);
    } else {
      // 테스트 계정이 없는 경우 채팅 페이지로 직접 이동
      await page.goto(`${baseURL}/student/chat`);
    }
  });

  test('채팅 인터페이스 기본 요소 확인', async ({ page }) => {
    // 채팅 메시지 영역 확인
    await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
    
    // 메시지 입력 필드 확인
    await expect(page.locator('textarea[placeholder*="메시지"]')).toBeVisible();
    
    // 전송 버튼 확인
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 파일 업로드 버튼 확인 (있는 경우)
    const fileUploadButton = page.locator('input[type="file"]');
    if (await fileUploadButton.count() > 0) {
      await expect(fileUploadButton).toBeVisible();
    }
  });

  test('메시지 전송 기능 테스트', async ({ page }) => {
    const testMessage = '안녕하세요, 테스트 메시지입니다.';
    
    // 메시지 입력
    await page.fill('textarea[placeholder*="메시지"]', testMessage);
    
    // 전송 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 메시지가 채팅 영역에 표시되는지 확인
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
    
    // 입력 필드가 비워지는지 확인
    await expect(page.locator('textarea[placeholder*="메시지"]')).toHaveValue('');
  });

  test('Enter 키로 메시지 전송 테스트', async ({ page }) => {
    const testMessage = 'Enter 키 테스트 메시지';
    
    // 메시지 입력
    await page.fill('textarea[placeholder*="메시지"]', testMessage);
    
    // Enter 키 누르기
    await page.keyboard.press('Enter');
    
    // 메시지가 전송되었는지 확인
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('Shift+Enter로 줄바꿈 테스트', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지"]');
    
    // 첫 번째 줄 입력
    await messageInput.fill('첫 번째 줄');
    
    // Shift+Enter로 줄바꿈
    await page.keyboard.press('Shift+Enter');
    
    // 두 번째 줄 입력
    await messageInput.type('두 번째 줄');
    
    // 입력 필드에 줄바꿈이 포함되어 있는지 확인
    const value = await messageInput.inputValue();
    expect(value).toContain('\n');
  });

  test('긴 메시지 처리 테스트', async ({ page }) => {
    const longMessage = 'A'.repeat(1000); // 1000자 메시지
    
    // 긴 메시지 입력
    await page.fill('textarea[placeholder*="메시지"]', longMessage);
    
    // 전송
    await page.click('button[type="submit"]');
    
    // 메시지가 적절히 표시되는지 확인 (잘림 또는 스크롤)
    const messageElement = page.locator(`text=${longMessage.substring(0, 50)}`);
    await expect(messageElement).toBeVisible();
  });

  test('파일 업로드 기능 테스트', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      // 테스트용 파일 생성 (텍스트 파일)
      const testFileContent = 'This is a test file content.';
      
      // 파일 업로드 시뮬레이션
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testFileContent)
      });
      
      // 파일이 업로드되었다는 표시 확인
      await expect(page.locator('text=test.txt')).toBeVisible();
    }
  });

  test('이미지 파일 업로드 테스트', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      // 1x1 픽셀 PNG 이미지 생성
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
        0x60, 0x82
      ]);
      
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      // 이미지 미리보기 또는 업로드 표시 확인
      await expect(page.locator('text=test-image.png')).toBeVisible();
    }
  });

  test('채팅 히스토리 스크롤 테스트', async ({ page }) => {
    // 여러 메시지 전송하여 스크롤 생성
    for (let i = 1; i <= 10; i++) {
      await page.fill('textarea[placeholder*="메시지"]', `테스트 메시지 ${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100); // 메시지 전송 간격
    }
    
    // 채팅 영역이 스크롤 가능한지 확인
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    const scrollHeight = await chatMessages.evaluate(el => el.scrollHeight);
    const clientHeight = await chatMessages.evaluate(el => el.clientHeight);
    
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    
    // 최신 메시지가 보이는지 확인
    await expect(page.locator('text=테스트 메시지 10')).toBeVisible();
  });

  test('메시지 타임스탬프 표시 확인', async ({ page }) => {
    const testMessage = '타임스탬프 테스트';
    
    // 메시지 전송
    await page.fill('textarea[placeholder*="메시지"]', testMessage);
    await page.click('button[type="submit"]');
    
    // 타임스탬프가 표시되는지 확인
    const timestampPattern = /\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}/;
    const timestampElement = page.locator('[data-testid="message-timestamp"]');
    
    if (await timestampElement.count() > 0) {
      const timestampText = await timestampElement.textContent();
      expect(timestampText).toMatch(timestampPattern);
    }
  });

  test('AI 응답 대기 상태 표시 테스트', async ({ page }) => {
    const testMessage = 'AI에게 질문합니다.';
    
    // 메시지 전송
    await page.fill('textarea[placeholder*="메시지"]', testMessage);
    await page.click('button[type="submit"]');
    
    // 로딩 인디케이터 확인
    const loadingIndicator = page.locator('[data-testid="typing-indicator"]');
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('채팅 입력 필드 자동 크기 조정 테스트', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지"]');
    
    // 초기 높이 측정
    const initialHeight = await messageInput.evaluate(el => el.offsetHeight);
    
    // 여러 줄 텍스트 입력
    const multilineText = '첫 번째 줄\n두 번째 줄\n세 번째 줄\n네 번째 줄';
    await messageInput.fill(multilineText);
    
    // 높이가 증가했는지 확인
    const expandedHeight = await messageInput.evaluate(el => el.offsetHeight);
    expect(expandedHeight).toBeGreaterThan(initialHeight);
  });

  test('메시지 전송 버튼 활성화/비활성화 테스트', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // 빈 입력 상태에서 버튼 비활성화 확인
    await expect(sendButton).toBeDisabled();
    
    // 텍스트 입력 후 버튼 활성화 확인
    await messageInput.fill('테스트');
    await expect(sendButton).toBeEnabled();
    
    // 텍스트 삭제 후 다시 비활성화 확인
    await messageInput.fill('');
    await expect(sendButton).toBeDisabled();
  });

  test('채팅 연결 상태 표시 테스트', async ({ page }) => {
    // 연결 상태 표시 요소 확인
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    
    if (await connectionStatus.count() > 0) {
      // 연결됨 상태 확인
      await expect(connectionStatus).toContainText(/연결됨|온라인|Connected/i);
    }
  });

  test('채팅 에러 처리 테스트', async ({ page }) => {
    // 네트워크 오프라인 시뮬레이션
    await page.context().setOffline(true);
    
    // 메시지 전송 시도
    await page.fill('textarea[placeholder*="메시지"]', '오프라인 테스트');
    await page.click('button[type="submit"]');
    
    // 에러 메시지 표시 확인
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
    
    // 네트워크 다시 온라인
    await page.context().setOffline(false);
  });
});
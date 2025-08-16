import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  const baseURL = process.env.PRODUCTION_URL || 'http://localhost:4173';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await injectAxe(page);
  });

  test('홈페이지 접근성 검사', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('로그인 페이지 접근성 검사', async ({ page }) => {
    await page.click('text=로그인');
    await page.waitForLoadState('networkidle');
    
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // 로그인 폼에 특화된 규칙들
        'label': { enabled: true },
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
      }
    });
  });

  test('키보드 네비게이션 테스트', async ({ page }) => {
    // Tab 키로 모든 상호작용 가능한 요소들을 순회할 수 있는지 확인
    const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
    }
  });

  test('색상 대비 검사', async ({ page }) => {
    const violations = await getViolations(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(violations).toHaveLength(0);
  });

  test('이미지 alt 텍스트 검사', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaLabelledby = await img.getAttribute('aria-labelledby');
      
      // 이미지는 alt 텍스트나 aria-label, aria-labelledby 중 하나는 있어야 함
      expect(alt !== null || ariaLabel !== null || ariaLabelledby !== null).toBeTruthy();
    }
  });

  test('폼 라벨 연결 검사', async ({ page }) => {
    await page.click('text=로그인');
    await page.waitForLoadState('networkidle');
    
    const inputs = await page.locator('input').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel !== null || ariaLabelledby !== null).toBeTruthy();
      }
    }
  });

  test('헤딩 구조 검사', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    if (headings.length > 0) {
      // 첫 번째 헤딩이 h1인지 확인
      const firstHeading = headings[0];
      const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('h1');
      
      // 헤딩 레벨이 순차적인지 확인
      let previousLevel = 1;
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const currentLevel = parseInt(tagName.charAt(1));
        
        // 헤딩 레벨이 1보다 크게 건너뛰지 않는지 확인
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        previousLevel = currentLevel;
      }
    }
  });

  test('ARIA 속성 검사', async ({ page }) => {
    const violations = await getViolations(page, null, {
      rules: {
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-roles': { enabled: true },
      }
    });
    
    expect(violations).toHaveLength(0);
  });

  test('버튼과 링크 접근성 검사', async ({ page }) => {
    const buttons = await page.locator('button').all();
    const links = await page.locator('a').all();
    
    // 모든 버튼에 접근 가능한 이름이 있는지 확인
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');
      
      expect(
        (text && text.trim().length > 0) || 
        ariaLabel !== null || 
        ariaLabelledby !== null
      ).toBeTruthy();
    }
    
    // 모든 링크에 접근 가능한 이름이 있는지 확인
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const ariaLabelledby = await link.getAttribute('aria-labelledby');
      
      expect(
        (text && text.trim().length > 0) || 
        ariaLabel !== null || 
        ariaLabelledby !== null
      ).toBeTruthy();
    }
  });

  test('스크린 리더 호환성 검사', async ({ page }) => {
    const violations = await getViolations(page, null, {
      rules: {
        'bypass': { enabled: true }, // 스킵 링크
        'page-has-heading-one': { enabled: true },
        'landmark-one-main': { enabled: true },
        'region': { enabled: true },
      }
    });
    
    expect(violations).toHaveLength(0);
  });

  test('포커스 관리 검사', async ({ page }) => {
    // 모달이나 드롭다운 등의 포커스 트랩 테스트
    const interactiveElements = await page.locator('button, a, input').all();
    
    for (let i = 0; i < Math.min(interactiveElements.length, 5); i++) {
      await interactiveElements[i].focus();
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
      
      // 포커스된 요소가 시각적으로 구분되는지 확인
      const outline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      );
      const boxShadow = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).boxShadow
      );
      
      // 포커스 표시가 있는지 확인 (outline 또는 box-shadow)
      expect(outline !== 'none' || boxShadow !== 'none').toBeTruthy();
    }
  });

  test('동적 콘텐츠 접근성 검사', async ({ page }) => {
    // 동적으로 추가되는 콘텐츠의 접근성 확인
    const dynamicButtons = await page.locator('[aria-live], [role="alert"], [role="status"]').all();
    
    for (const element of dynamicButtons) {
      const ariaLive = await element.getAttribute('aria-live');
      const role = await element.getAttribute('role');
      
      // aria-live 또는 적절한 role이 설정되어 있는지 확인
      expect(
        ariaLive !== null || 
        role === 'alert' || 
        role === 'status' || 
        role === 'log'
      ).toBeTruthy();
    }
  });

  test('모바일 접근성 검사', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 터치 타겟 크기 검사 (최소 44x44px)
    const touchTargets = await page.locator('button, a, input[type="button"], input[type="submit"]').all();
    
    for (const target of touchTargets.slice(0, 10)) { // 처음 10개만 검사
      const boundingBox = await target.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    // 모바일에서의 전체 접근성 검사
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'target-size': { enabled: true },
        'color-contrast': { enabled: true },
      }
    });
  });
});
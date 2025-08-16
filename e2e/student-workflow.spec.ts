import { test, expect } from '@playwright/test';

test.describe('Student Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-student-id',
            email: 'student@example.com',
            user_metadata: { name: 'Test Student' },
          },
        }),
      });
    });

    // Mock user role
    await page.route('**/rest/v1/user_roles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-role-id',
          user_id: 'test-student-id',
          role: 'student',
        }),
      });
    });

    // Mock activities
    await page.route('**/rest/v1/activities*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'activity-1',
            title: 'Test Discussion Activity',
            description: 'A test discussion activity',
            type: 'discussion',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'activity-2',
            title: 'Test Argumentation Activity',
            description: 'A test argumentation activity',
            type: 'argumentation',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/');
  });

  test('should complete student dashboard workflow', async ({ page }) => {
    // Should redirect to student dashboard after login
    await expect(page).toHaveURL('/student');

    // Should display student name
    await expect(page.locator('text=Test Student')).toBeVisible();

    // Should display available activities
    await expect(page.locator('text=Test Discussion Activity')).toBeVisible();
    await expect(page.locator('text=Test Argumentation Activity')).toBeVisible();

    // Should show activity statistics
    await expect(page.locator('[data-testid="active-activities"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-stats"]')).toBeVisible();
  });

  test('should navigate to activity page', async ({ page }) => {
    await page.goto('/student');

    // Click on an activity
    await page.click('text=Test Discussion Activity');

    // Should navigate to activity page
    await expect(page).toHaveURL(/\/student\/activity\/activity-1/);

    // Should display activity title
    await expect(page.locator('h1:has-text("Test Discussion Activity")')).toBeVisible();

    // Should display chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Should display checklist
    await expect(page.locator('[data-testid="checklist-progress"]')).toBeVisible();
  });

  test('should send chat message', async ({ page }) => {
    // Mock chat API
    await page.route('**/functions/v1/ai-chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Hello! How can I help you with this activity?',
        }),
      });
    });

    // Mock chat logs
    await page.route('**/rest/v1/chat_logs*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-message-id' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/student/activity/activity-1');

    // Type message in chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Hello, I need help with this activity');

    // Send message
    await page.click('[data-testid="send-button"]');

    // Should display user message
    await expect(page.locator('text=Hello, I need help with this activity')).toBeVisible();

    // Should display AI response
    await expect(page.locator('text=Hello! How can I help you with this activity?')).toBeVisible();

    // Input should be cleared
    await expect(chatInput).toHaveValue('');
  });

  test('should upload file', async ({ page }) => {
    // Mock file upload
    await page.route('**/storage/v1/object/uploads/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          Key: 'uploads/test-file.pdf',
          id: 'file-id',
        }),
      });
    });

    await page.goto('/student/activity/activity-1');

    // Click file upload button
    await page.click('[data-testid="file-upload-button"]');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content'),
    });

    // Should show upload progress
    await expect(page.locator('text=업로드 중')).toBeVisible();

    // Should show success message
    await expect(page.locator('text=파일이 성공적으로 업로드되었습니다')).toBeVisible();
  });

  test('should complete checklist item', async ({ page }) => {
    // Mock checklist items
    await page.route('**/rest/v1/checklist_items*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'checklist-1',
            activity_id: 'activity-1',
            title: 'Read the introduction',
            description: 'Read the activity introduction carefully',
            order_index: 1,
          },
          {
            id: 'checklist-2',
            activity_id: 'activity-1',
            title: 'Participate in discussion',
            description: 'Join the discussion with your peers',
            order_index: 2,
          },
        ]),
      });
    });

    // Mock checklist progress
    await page.route('**/rest/v1/student_checklist_progress*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'progress-id' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/student/activity/activity-1');

    // Should display checklist items
    await expect(page.locator('text=Read the introduction')).toBeVisible();
    await expect(page.locator('text=Participate in discussion')).toBeVisible();

    // Complete first checklist item
    await page.click('[data-testid="checklist-item-checklist-1"] input[type="checkbox"]');

    // Should show completion
    await expect(page.locator('[data-testid="checklist-item-checklist-1"]')).toHaveClass(/completed/);

    // Should update progress bar
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '50');
  });

  test('should submit argumentation response', async ({ page }) => {
    // Mock argumentation activity
    await page.route('**/rest/v1/activities*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'activity-2',
          title: 'Test Argumentation Activity',
          type: 'argumentation',
          is_active: true,
        }),
      });
    });

    // Mock argumentation response
    await page.route('**/rest/v1/argumentation_responses*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'response-id' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(null),
        });
      }
    });

    await page.goto('/student/activity/activity-2');

    // Should display argumentation editor
    await expect(page.locator('[data-testid="argumentation-editor"]')).toBeVisible();

    // Fill in argumentation content
    const editor = page.locator('[data-testid="argumentation-content"]');
    await editor.fill('This is my argument about the topic. I believe that...');

    // Save draft
    await page.click('[data-testid="save-draft-button"]');
    await expect(page.locator('text=초안이 저장되었습니다')).toBeVisible();

    // Submit final response
    await page.click('[data-testid="submit-button"]');

    // Should show confirmation dialog
    await expect(page.locator('text=정말로 제출하시겠습니까?')).toBeVisible();
    await page.click('button:has-text("제출")');

    // Should show success message
    await expect(page.locator('text=논증문이 성공적으로 제출되었습니다')).toBeVisible();

    // Submit button should be disabled
    await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/rest/v1/activities*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/student');

    // Should display error message
    await expect(page.locator('text=데이터를 불러오는 중 오류가 발생했습니다')).toBeVisible();

    // Should show retry button
    await expect(page.locator('button:has-text("다시 시도")')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/student');

    // Should display mobile-friendly layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Should hide desktop sidebar
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Navigate to activity
    await page.click('text=Test Discussion Activity');
    await expect(page).toHaveURL(/\/student\/activity\/activity-1/);

    // Chat interface should be mobile-friendly
    const chatInterface = page.locator('[data-testid="chat-interface"]');
    await expect(chatInterface).toBeVisible();
    
    // Input should be properly sized
    const chatInput = page.locator('[data-testid="chat-input"]');
    const inputBox = await chatInput.boundingBox();
    expect(inputBox?.width).toBeLessThan(375);
  });
});
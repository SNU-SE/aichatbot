import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load student dashboard within performance budget', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/student', { waitUntil: 'networkidle' });

    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {};

        // LCP (Largest Contentful Paint)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // FID (First Input Delay)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            vitals.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });

        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // FCP (First Contentful Paint)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          });
        }).observe({ entryTypes: ['paint'] });

        // Wait for measurements
        setTimeout(() => resolve(vitals), 3000);
      });
    });

    // Assert performance budgets
    expect(webVitals.lcp).toBeLessThan(2500); // LCP should be under 2.5s
    expect(webVitals.fcp).toBeLessThan(1800); // FCP should be under 1.8s
    expect(webVitals.cls).toBeLessThan(0.1); // CLS should be under 0.1
    
    if (webVitals.fid) {
      expect(webVitals.fid).toBeLessThan(100); // FID should be under 100ms
    }
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    await page.route('**/rest/v1/students*', async (route) => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `student-${i}`,
        name: `Student ${i}`,
        email: `student${i}@example.com`,
        class_name: `Class ${Math.floor(i / 30)}`,
        created_at: new Date().toISOString(),
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset),
      });
    });

    const startTime = Date.now();
    await page.goto('/admin/students');

    // Wait for virtualized list to render
    await page.waitForSelector('[data-testid="virtualized-student-list"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

    // Check if only visible items are rendered (virtualization working)
    const renderedItems = await page.locator('[data-testid="student-item"]').count();
    expect(renderedItems).toBeLessThan(50); // Should render only visible items

    // Test scrolling performance
    const scrollStartTime = Date.now();
    await page.mouse.wheel(0, 5000); // Scroll down
    await page.waitForTimeout(100); // Wait for scroll to settle

    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(500); // Scrolling should be smooth
  });

  test('should maintain performance during real-time updates', async ({ page }) => {
    // Mock real-time updates
    let updateCount = 0;
    await page.route('**/rest/v1/chat_logs*', async (route) => {
      const messages = Array.from({ length: updateCount }, (_, i) => ({
        id: `message-${i}`,
        message: `Real-time message ${i}`,
        sender: i % 2 === 0 ? 'user' : 'ai',
        created_at: new Date().toISOString(),
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messages),
      });
    });

    await page.goto('/student/activity/activity-1');

    // Simulate real-time updates
    const performanceMetrics: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      updateCount += 5; // Add 5 new messages
      
      const startTime = performance.now();
      
      // Trigger update (simulate WebSocket message)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('realtime-update'));
      });
      
      await page.waitForTimeout(100); // Wait for update to process
      
      const updateTime = performance.now() - startTime;
      performanceMetrics.push(updateTime);
    }

    // Average update time should be reasonable
    const avgUpdateTime = performanceMetrics.reduce((a, b) => a + b, 0) / performanceMetrics.length;
    expect(avgUpdateTime).toBeLessThan(50); // Updates should be under 50ms on average

    // No update should take too long
    const maxUpdateTime = Math.max(...performanceMetrics);
    expect(maxUpdateTime).toBeLessThan(200); // No single update over 200ms
  });

  test('should optimize bundle size', async ({ page }) => {
    // Navigate to app and measure network usage
    const response = await page.goto('/');
    
    // Get all network requests
    const requests = [];
    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        requests.push({
          url: response.url(),
          size: response.headers()['content-length'],
          type: response.url().includes('.js') ? 'js' : 'css',
        });
      }
    });

    await page.waitForLoadState('networkidle');

    // Calculate total bundle size
    const totalJSSize = requests
      .filter(req => req.type === 'js')
      .reduce((total, req) => total + (parseInt(req.size || '0') || 0), 0);

    const totalCSSSize = requests
      .filter(req => req.type === 'css')
      .reduce((total, req) => total + (parseInt(req.size || '0') || 0), 0);

    // Assert bundle size budgets
    expect(totalJSSize).toBeLessThan(500 * 1024); // JS bundle under 500KB
    expect(totalCSSSize).toBeLessThan(100 * 1024); // CSS bundle under 100KB

    // Check for code splitting (multiple JS chunks)
    const jsFiles = requests.filter(req => req.type === 'js');
    expect(jsFiles.length).toBeGreaterThan(1); // Should have multiple chunks
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('/student');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Navigate through multiple pages to test memory leaks
    const pages = [
      '/student/activity/activity-1',
      '/student/history',
      '/student/profile',
      '/student',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Let page settle
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory growth should be reasonable (less than 50MB increase)
    const memoryGrowth = finalMemory - initialMemory;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });

  test('should load efficiently on slow networks', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/student', { waitUntil: 'domcontentloaded' });

    // Should show loading states quickly
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Should complete loading within reasonable time even on slow network
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds on slow network
  });

  test('should optimize image loading', async ({ page }) => {
    await page.goto('/student');

    // Check for lazy loading attributes
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const loading = await img.getAttribute('loading');
      const src = await img.getAttribute('src');
      
      // Images should have lazy loading (except above-the-fold)
      if (src && !src.includes('logo') && !src.includes('hero')) {
        expect(loading).toBe('lazy');
      }
    }

    // Check for proper image formats (WebP support)
    const modernImages = await page.locator('img[src*=".webp"], picture source[type="image/webp"]').count();
    expect(modernImages).toBeGreaterThan(0); // Should use modern image formats
  });
});
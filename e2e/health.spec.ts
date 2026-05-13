import { test, expect } from '@playwright/test';

test.describe('Health Checks', () => {
  test('should load homepage', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    let errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});

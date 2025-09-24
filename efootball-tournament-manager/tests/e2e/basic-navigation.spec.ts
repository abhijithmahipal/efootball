import { test, expect } from '@playwright/test';

test.describe('Basic Navigation Tests', () => {
  test('should load home page correctly', async ({ page }) => {
    await page.goto('/');

    // Check if the page loads
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  });

  test('should navigate to admin login', async ({ page }) => {
    await page.goto('/');

    // Click admin link
    await page.click('[data-testid="admin-link"]');

    // Should redirect to login page
    await expect(page).toHaveURL('/admin/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should show navigation header', async ({ page }) => {
    await page.goto('/');

    // Check if header is visible
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Desktop Large', width: 1920, height: 1080 },
    { name: 'Desktop Medium', width: 1366, height: 768 },
    { name: 'Desktop Small', width: 1024, height: 768 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Mobile Large', width: 414, height: 896 },
    { name: 'Mobile Medium', width: 375, height: 667 },
    { name: 'Mobile Small', width: 320, height: 568 },
  ];

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // Test home page responsiveness
      await page.goto('/');

      // Header should always be visible
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      // Title should be visible and properly sized
      const title = page.locator('[data-testid="app-title"]');
      await expect(title).toBeVisible();

      // Check if navigation is responsive
      if (viewport.width < 768) {
        // Mobile: Navigation might be collapsed
        const mobileToggle = page.locator('[data-testid="mobile-nav-toggle"]');
        if ((await mobileToggle.count()) > 0) {
          await expect(mobileToggle).toBeVisible();
          await mobileToggle.click();
        }
      }

      // Navigation links should be accessible
      await expect(
        page.locator('[data-testid="schedule-nav-link"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="standings-nav-link"]')
      ).toBeVisible();

      // Main content should be visible
      await expect(
        page.locator('[data-testid="welcome-message"]')
      ).toBeVisible();

      // Test schedule page responsiveness
      await page.goto('/schedule');
      await expect(
        page.locator('[data-testid="schedule-title"]')
      ).toBeVisible();

      // Check match display responsiveness
      const matchItems = page.locator('[data-testid="match-item"]');
      const matchCount = await matchItems.count();

      if (matchCount > 0) {
        const firstMatch = matchItems.first();
        await expect(firstMatch).toBeVisible();

        // Match details should be readable
        await expect(
          firstMatch.locator('[data-testid="home-player"]')
        ).toBeVisible();
        await expect(
          firstMatch.locator('[data-testid="away-player"]')
        ).toBeVisible();

        // On mobile, match layout might be stacked
        if (viewport.width < 768) {
          // Verify mobile-specific layout adjustments
          const matchContainer = firstMatch.locator(
            '[data-testid="match-container"]'
          );
          if ((await matchContainer.count()) > 0) {
            await expect(matchContainer).toBeVisible();
          }
        }
      }

      // Test standings page responsiveness
      await page.goto('/standings');
      await expect(
        page.locator('[data-testid="standings-title"]')
      ).toBeVisible();

      const standingsTable = page.locator('[data-testid="standings-table"]');
      if ((await standingsTable.count()) > 0) {
        await expect(standingsTable).toBeVisible();

        if (viewport.width < 768) {
          // On mobile, table might have horizontal scroll or be reformatted
          const tableContainer = page.locator(
            '[data-testid="table-container"]'
          );
          if ((await tableContainer.count()) > 0) {
            await expect(tableContainer).toBeVisible();
          }
        } else {
          // On desktop, all columns should be visible
          const headerCells = page.locator('[data-testid^="header-"]');
          const headerCount = await headerCells.count();
          expect(headerCount).toBeGreaterThan(5); // Should have multiple columns
        }
      }
    });
  }

  test('should handle orientation changes correctly', async ({ page }) => {
    // Start in portrait mode (mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();

    // Switch to landscape mode
    await page.setViewportSize({ width: 667, height: 375 });

    // Content should still be accessible
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Navigation should adapt
    const navigation = page.locator('[data-testid="nav-menu"]');
    await expect(navigation).toBeVisible();
  });

  test('should maintain functionality across different screen sizes', async ({
    page,
  }) => {
    const testViewports = [
      { width: 1200, height: 800 }, // Desktop
      { width: 768, height: 1024 }, // Tablet
      { width: 375, height: 667 }, // Mobile
    ];

    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);

      // Test navigation functionality
      await page.goto('/');

      // Navigate to schedule
      if (viewport.width < 768) {
        // Handle mobile navigation
        const mobileToggle = page.locator('[data-testid="mobile-nav-toggle"]');
        if ((await mobileToggle.count()) > 0) {
          await mobileToggle.click();
        }
      }

      await page.click('[data-testid="schedule-nav-link"]');
      await expect(page).toHaveURL('/schedule');

      // Navigate to standings
      if (viewport.width < 768) {
        const mobileToggle = page.locator('[data-testid="mobile-nav-toggle"]');
        if ((await mobileToggle.count()) > 0) {
          await mobileToggle.click();
        }
      }

      await page.click('[data-testid="standings-nav-link"]');
      await expect(page).toHaveURL('/standings');

      // Navigate back to home
      if (viewport.width < 768) {
        const mobileToggle = page.locator('[data-testid="mobile-nav-toggle"]');
        if ((await mobileToggle.count()) > 0) {
          await mobileToggle.click();
        }
      }

      await page.click('[data-testid="home-nav-link"]');
      await expect(page).toHaveURL('/');
    }
  });

  test('should display admin interface responsively', async ({ page }) => {
    const adminViewports = [
      { width: 1200, height: 800 }, // Desktop
      { width: 768, height: 1024 }, // Tablet
      { width: 375, height: 667 }, // Mobile
    ];

    for (const viewport of adminViewports) {
      await page.setViewportSize(viewport);

      // Navigate to admin login
      await page.goto('/admin');

      // Login form should be responsive
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="password-input"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

      // Form should be properly sized
      const loginForm = page.locator('[data-testid="login-form"]');
      const formBox = await loginForm.boundingBox();

      if (formBox) {
        // Form should not exceed viewport width
        expect(formBox.width).toBeLessThanOrEqual(viewport.width);

        // Form should be reasonably sized for the viewport
        if (viewport.width >= 768) {
          expect(formBox.width).toBeGreaterThan(300);
        } else {
          expect(formBox.width).toBeGreaterThan(250);
        }
      }

      // Test successful login and admin interface
      await page.fill('[data-testid="email-input"]', 'admin@test.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Admin dashboard should be responsive
      await expect(
        page.locator('[data-testid="admin-dashboard"]')
      ).toBeVisible();

      // Navigation should work on all screen sizes
      await page.click('[data-testid="manage-players-link"]');
      await expect(page).toHaveURL('/admin/players');

      // Player management interface should be responsive
      await expect(
        page.locator('[data-testid="player-management-title"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="player-name-input"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="add-player-button"]')
      ).toBeVisible();

      if (viewport.width < 768) {
        // On mobile, form elements might be stacked
        const addPlayerForm = page.locator('[data-testid="add-player-form"]');
        if ((await addPlayerForm.count()) > 0) {
          await expect(addPlayerForm).toBeVisible();
        }
      }
    }
  });

  test('should handle table responsiveness correctly', async ({ page }) => {
    await page.goto('/standings');

    // Test desktop table display
    await page.setViewportSize({ width: 1200, height: 800 });

    const standingsTable = page.locator('[data-testid="standings-table"]');
    if ((await standingsTable.count()) > 0) {
      await expect(standingsTable).toBeVisible();

      // All columns should be visible on desktop
      const columns = [
        'position',
        'player-name',
        'matches-played',
        'wins',
        'draws',
        'losses',
        'goals-for',
        'goals-against',
        'goal-difference',
        'points',
      ];

      for (const column of columns) {
        await expect(
          page.locator(`[data-testid="header-${column}"]`)
        ).toBeVisible();
      }
    }

    // Test tablet table display
    await page.setViewportSize({ width: 768, height: 1024 });

    if ((await standingsTable.count()) > 0) {
      await expect(standingsTable).toBeVisible();

      // Table might have horizontal scroll on tablet
      const tableContainer = page.locator('[data-testid="table-container"]');
      if ((await tableContainer.count()) > 0) {
        const containerBox = await tableContainer.boundingBox();
        expect(containerBox?.width).toBeLessThanOrEqual(768);
      }
    }

    // Test mobile table display
    await page.setViewportSize({ width: 375, height: 667 });

    if ((await standingsTable.count()) > 0) {
      // Table should still be accessible, possibly with horizontal scroll
      // or transformed into a mobile-friendly format
      await expect(standingsTable).toBeVisible();

      // Check if mobile table transformation is applied
      const mobileTable = page.locator(
        '[data-testid="mobile-standings-table"]'
      );
      if ((await mobileTable.count()) > 0) {
        await expect(mobileTable).toBeVisible();
      }
    }
  });

  test('should maintain touch targets on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Test home page touch targets
    await page.goto('/');

    const touchTargets = [
      '[data-testid="schedule-nav-link"]',
      '[data-testid="standings-nav-link"]',
      '[data-testid="admin-nav-link"]',
      '[data-testid="view-schedule-link"]',
      '[data-testid="view-standings-link"]',
    ];

    for (const selector of touchTargets) {
      const element = page.locator(selector);
      if ((await element.count()) > 0) {
        const box = await element.boundingBox();
        if (box) {
          // Touch targets should be at least 44px (iOS) or 48px (Android) in size
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
        }
      }
    }

    // Test admin interface touch targets
    await page.goto('/admin');

    const adminTouchTargets = [
      '[data-testid="login-button"]',
      '[data-testid="email-input"]',
      '[data-testid="password-input"]',
    ];

    for (const selector of adminTouchTargets) {
      const element = page.locator(selector);
      if ((await element.count()) > 0) {
        const box = await element.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should handle text scaling appropriately', async ({ page }) => {
    const viewports = [
      { width: 1200, height: 800, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/');

      // Title should be readable at all sizes
      const title = page.locator('[data-testid="app-title"]');
      await expect(title).toBeVisible();

      const titleStyles = await title.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          lineHeight: styles.lineHeight,
        };
      });

      // Font size should be appropriate for viewport
      const fontSize = parseInt(titleStyles.fontSize);
      if (viewport.width >= 1024) {
        expect(fontSize).toBeGreaterThanOrEqual(24); // Desktop: larger text
      } else if (viewport.width >= 768) {
        expect(fontSize).toBeGreaterThanOrEqual(20); // Tablet: medium text
      } else {
        expect(fontSize).toBeGreaterThanOrEqual(18); // Mobile: smaller but readable text
      }

      // Test body text readability
      const bodyText = page.locator('[data-testid="welcome-message"]');
      if ((await bodyText.count()) > 0) {
        const bodyStyles = await bodyText.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
          };
        });

        const bodyFontSize = parseInt(bodyStyles.fontSize);
        expect(bodyFontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
      }
    }
  });

  test('should handle content overflow correctly', async ({ page }) => {
    // Test with very narrow viewport
    await page.setViewportSize({ width: 280, height: 568 });

    await page.goto('/');

    // Content should not overflow horizontally
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();

    if (bodyBox) {
      expect(bodyBox.width).toBeLessThanOrEqual(280);
    }

    // Test with very wide viewport
    await page.setViewportSize({ width: 2560, height: 1440 });

    await page.goto('/');

    // Content should be properly centered or constrained
    const mainContent = page.locator('[data-testid="main-content"]');
    if ((await mainContent.count()) > 0) {
      const contentBox = await mainContent.boundingBox();
      if (contentBox) {
        // Content should not be excessively wide
        expect(contentBox.width).toBeLessThan(2560);
      }
    }
  });
});

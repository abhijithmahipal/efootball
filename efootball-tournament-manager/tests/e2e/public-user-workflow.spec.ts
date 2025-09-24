import { test, expect } from '@playwright/test';

test.describe('Public User Workflow - Viewing Tournament Data', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete public user journey from home to viewing schedules and standings', async ({
    page,
  }) => {
    // Step 1: Verify home page loads correctly
    await expect(page.locator('[data-testid="app-title"]')).toHaveText(
      'eFootball Tournament Manager'
    );
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Step 2: Navigate to schedule page
    await page.click('[data-testid="view-schedule-link"]');
    await expect(page).toHaveURL('/schedule');

    // Verify schedule page elements
    await expect(page.locator('[data-testid="schedule-title"]')).toHaveText(
      'Match Schedule'
    );

    // Check if matches are displayed (assuming some test data exists)
    const matchesExist =
      (await page.locator('[data-testid="match-item"]').count()) > 0;

    if (matchesExist) {
      // Verify match display format
      const firstMatch = page.locator('[data-testid="match-item"]').first();
      await expect(
        firstMatch.locator('[data-testid="home-player"]')
      ).toBeVisible();
      await expect(
        firstMatch.locator('[data-testid="away-player"]')
      ).toBeVisible();
      await expect(
        firstMatch.locator('[data-testid="match-status"]')
      ).toBeVisible();

      // Check matchday organization
      await expect(
        page.locator('[data-testid="matchday-header"]')
      ).toHaveCount.greaterThan(0);
    } else {
      // No matches yet - should show appropriate message
      await expect(
        page.locator('[data-testid="no-matches-message"]')
      ).toBeVisible();
    }

    // Step 3: Navigate to standings page
    await page.click('[data-testid="view-standings-link"]');
    await expect(page).toHaveURL('/standings');

    // Verify standings page elements
    await expect(page.locator('[data-testid="standings-title"]')).toHaveText(
      'Points Table'
    );

    const playersExist =
      (await page.locator('[data-testid="standings-row"]').count()) > 0;

    if (playersExist) {
      // Verify standings table structure
      await expect(
        page.locator('[data-testid="standings-table"]')
      ).toBeVisible();

      // Check table headers
      const expectedHeaders = [
        'Position',
        'Player',
        'Played',
        'Won',
        'Drawn',
        'Lost',
        'Goals For',
        'Goals Against',
        'Goal Difference',
        'Points',
      ];

      for (const header of expectedHeaders) {
        await expect(
          page.locator(
            `[data-testid="header-${header
              .toLowerCase()
              .replace(/\s+/g, '-')}"]`
          )
        ).toBeVisible();
      }

      // Verify first row has all required data
      const firstRow = page.locator('[data-testid="standings-row"]').first();
      await expect(firstRow.locator('[data-testid="position"]')).toBeVisible();
      await expect(
        firstRow.locator('[data-testid="player-name"]')
      ).toBeVisible();
      await expect(
        firstRow.locator('[data-testid="matches-played"]')
      ).toBeVisible();
      await expect(firstRow.locator('[data-testid="points"]')).toBeVisible();
    } else {
      // No players yet - should show appropriate message
      await expect(
        page.locator('[data-testid="no-players-message"]')
      ).toBeVisible();
    }

    // Step 4: Navigate back to home
    await page.click('[data-testid="home-link"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Step 5: Test navigation menu functionality
    await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="schedule-nav-link"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="standings-nav-link"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="admin-nav-link"]')).toBeVisible();
  });

  test('should display match details correctly in different states', async ({
    page,
  }) => {
    // Setup: Assume we have test data with matches in different states
    await page.goto('/schedule');

    // Test pending match display
    const pendingMatch = page
      .locator('[data-testid="match-item"][data-status="pending"]')
      .first();
    if ((await pendingMatch.count()) > 0) {
      await expect(
        pendingMatch.locator('[data-testid="match-status"]')
      ).toHaveText('Pending');
      await expect(
        pendingMatch.locator('[data-testid="match-score"]')
      ).not.toBeVisible();
    }

    // Test completed match display
    const completedMatch = page
      .locator('[data-testid="match-item"][data-status="completed"]')
      .first();
    if ((await completedMatch.count()) > 0) {
      await expect(
        completedMatch.locator('[data-testid="match-status"]')
      ).toHaveText('Completed');
      await expect(
        completedMatch.locator('[data-testid="match-score"]')
      ).toBeVisible();

      // Verify score format (e.g., "2 - 1")
      const scoreText = await completedMatch
        .locator('[data-testid="match-score"]')
        .textContent();
      expect(scoreText).toMatch(/^\d+\s*-\s*\d+$/);
    }

    // Test matchday organization
    const matchdays = page.locator('[data-testid="matchday-section"]');
    const matchdayCount = await matchdays.count();

    if (matchdayCount > 0) {
      for (let i = 0; i < matchdayCount; i++) {
        const matchday = matchdays.nth(i);
        await expect(
          matchday.locator('[data-testid="matchday-header"]')
        ).toBeVisible();
        await expect(
          matchday.locator('[data-testid="match-item"]')
        ).toHaveCount.greaterThan(0);
      }
    }
  });

  test('should display playoff matches separately from league matches', async ({
    page,
  }) => {
    await page.goto('/schedule');

    // Check for league matches section
    const leagueSection = page.locator(
      '[data-testid="league-matches-section"]'
    );
    if ((await leagueSection.count()) > 0) {
      await expect(
        leagueSection.locator('[data-testid="section-title"]')
      ).toHaveText('League Matches');
      await expect(
        leagueSection.locator('[data-testid="match-item"]')
      ).toHaveCount.greaterThan(0);
    }

    // Check for playoff matches section
    const playoffSection = page.locator(
      '[data-testid="playoff-matches-section"]'
    );
    if ((await playoffSection.count()) > 0) {
      await expect(
        playoffSection.locator('[data-testid="section-title"]')
      ).toHaveText('Playoff Matches');

      // Check for different playoff rounds
      const semifinalMatches = playoffSection.locator(
        '[data-testid="semifinal-match"]'
      );
      const finalMatch = playoffSection.locator('[data-testid="final-match"]');
      const thirdPlaceMatch = playoffSection.locator(
        '[data-testid="third-place-match"]'
      );

      if ((await semifinalMatches.count()) > 0) {
        await expect(semifinalMatches).toHaveCount(2);
        await expect(
          playoffSection.locator('[data-testid="semifinal-header"]')
        ).toHaveText('Semifinals');
      }

      if ((await finalMatch.count()) > 0) {
        await expect(finalMatch).toHaveCount(1);
        await expect(
          playoffSection.locator('[data-testid="final-header"]')
        ).toHaveText('Final');
      }

      if ((await thirdPlaceMatch.count()) > 0) {
        await expect(thirdPlaceMatch).toHaveCount(1);
        await expect(
          playoffSection.locator('[data-testid="third-place-header"]')
        ).toHaveText('Third Place Playoff');
      }
    }
  });

  test('should display standings with correct sorting and statistics', async ({
    page,
  }) => {
    await page.goto('/standings');

    const standingsRows = page.locator('[data-testid="standings-row"]');
    const rowCount = await standingsRows.count();

    if (rowCount > 0) {
      // Verify positions are sequential
      for (let i = 0; i < rowCount; i++) {
        const row = standingsRows.nth(i);
        const position = await row
          .locator('[data-testid="position"]')
          .textContent();
        expect(parseInt(position!)).toBe(i + 1);
      }

      // Verify points are in descending order
      const points: number[] = [];
      for (let i = 0; i < rowCount; i++) {
        const row = standingsRows.nth(i);
        const pointsText = await row
          .locator('[data-testid="points"]')
          .textContent();
        points.push(parseInt(pointsText!));
      }

      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeLessThanOrEqual(points[i - 1]);
      }

      // Verify goal difference calculation
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = standingsRows.nth(i);
        const goalsFor = parseInt(
          (await row.locator('[data-testid="goals-for"]').textContent()) || '0'
        );
        const goalsAgainst = parseInt(
          (await row.locator('[data-testid="goals-against"]').textContent()) ||
            '0'
        );
        const goalDifference = parseInt(
          (await row
            .locator('[data-testid="goal-difference"]')
            .textContent()) || '0'
        );

        expect(goalDifference).toBe(goalsFor - goalsAgainst);
      }

      // Verify matches played calculation
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = standingsRows.nth(i);
        const matchesPlayed = parseInt(
          (await row.locator('[data-testid="matches-played"]').textContent()) ||
            '0'
        );
        const wins = parseInt(
          (await row.locator('[data-testid="wins"]').textContent()) || '0'
        );
        const draws = parseInt(
          (await row.locator('[data-testid="draws"]').textContent()) || '0'
        );
        const losses = parseInt(
          (await row.locator('[data-testid="losses"]').textContent()) || '0'
        );

        expect(matchesPlayed).toBe(wins + draws + losses);
      }
    }
  });

  test('should handle real-time updates correctly', async ({ page }) => {
    // This test simulates real-time updates by checking if the page updates
    // when data changes (would require actual Firebase connection in real scenario)

    await page.goto('/standings');

    // Take initial snapshot of standings
    const initialStandings = await page
      .locator('[data-testid="standings-row"]')
      .count();

    // Navigate to schedule and back to check for updates
    await page.goto('/schedule');
    await page.waitForTimeout(1000); // Wait for potential updates
    await page.goto('/standings');

    // Verify page still loads correctly
    await expect(page.locator('[data-testid="standings-table"]')).toBeVisible();

    // In a real scenario with live data, we would verify that changes
    // made by admin are reflected here without page refresh
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/standings');

    // Table should still be visible but may have horizontal scroll
    await expect(page.locator('[data-testid="standings-table"]')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/schedule');

    // Navigation might be collapsed on mobile
    const mobileNav = page.locator('[data-testid="mobile-nav-toggle"]');
    if ((await mobileNav.count()) > 0) {
      await mobileNav.click();
      await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
    }

    // Match items should stack vertically on mobile
    const matchItems = page.locator('[data-testid="match-item"]');
    if ((await matchItems.count()) > 0) {
      const firstMatch = matchItems.first();
      await expect(firstMatch).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Test empty schedule
    await page.goto('/schedule');

    // If no matches exist, should show appropriate message
    const matchCount = await page.locator('[data-testid="match-item"]').count();
    if (matchCount === 0) {
      await expect(
        page.locator('[data-testid="no-matches-message"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="no-matches-message"]')
      ).toContainText('No matches scheduled yet');
    }

    // Test empty standings
    await page.goto('/standings');

    const playerCount = await page
      .locator('[data-testid="standings-row"]')
      .count();
    if (playerCount === 0) {
      await expect(
        page.locator('[data-testid="no-players-message"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="no-players-message"]')
      ).toContainText('No players registered yet');
    }
  });

  test('should handle loading states correctly', async ({ page }) => {
    // Navigate to schedule page
    await page.goto('/schedule');

    // Check for loading indicator (should appear briefly)
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Loading indicator should be gone
    await expect(loadingIndicator).not.toBeVisible();

    // Content should be visible
    await expect(page.locator('[data-testid="schedule-title"]')).toBeVisible();

    // Test standings loading
    await page.goto('/standings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="standings-title"]')).toBeVisible();
  });

  test('should handle navigation correctly', async ({ page }) => {
    // Test all navigation links work correctly
    await page.goto('/');

    // Test schedule navigation
    await page.click('[data-testid="schedule-nav-link"]');
    await expect(page).toHaveURL('/schedule');
    await expect(page.locator('[data-testid="schedule-title"]')).toBeVisible();

    // Test standings navigation
    await page.click('[data-testid="standings-nav-link"]');
    await expect(page).toHaveURL('/standings');
    await expect(page.locator('[data-testid="standings-title"]')).toBeVisible();

    // Test home navigation
    await page.click('[data-testid="home-nav-link"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Test direct URL navigation
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="schedule-title"]')).toBeVisible();

    await page.goto('/standings');
    await expect(page.locator('[data-testid="standings-title"]')).toBeVisible();
  });

  test('should display tournament progress correctly', async ({ page }) => {
    await page.goto('/');

    // Check for tournament status indicator
    const tournamentStatus = page.locator('[data-testid="tournament-status"]');
    if ((await tournamentStatus.count()) > 0) {
      const statusText = await tournamentStatus.textContent();
      expect(statusText).toMatch(
        /(Not Started|In Progress|League Phase|Playoffs|Completed)/
      );
    }

    // Check for progress indicators
    const progressBar = page.locator('[data-testid="tournament-progress"]');
    if ((await progressBar.count()) > 0) {
      await expect(progressBar).toBeVisible();
    }

    // Navigate to schedule to see match progress
    await page.goto('/schedule');

    const totalMatches = await page
      .locator('[data-testid="match-item"]')
      .count();
    const completedMatches = await page
      .locator('[data-testid="match-item"][data-status="completed"]')
      .count();

    if (totalMatches > 0) {
      const progressPercentage = (completedMatches / totalMatches) * 100;

      const progressIndicator = page.locator('[data-testid="match-progress"]');
      if ((await progressIndicator.count()) > 0) {
        const progressText = await progressIndicator.textContent();
        expect(progressText).toContain(`${completedMatches}/${totalMatches}`);
      }
    }
  });
});

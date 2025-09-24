import { test, expect } from '@playwright/test';

test.describe('Admin Workflow - Complete Tournament Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full admin workflow from login to tournament completion', async ({
    page,
  }) => {
    // Step 1: Navigate to admin login
    await page.click('[data-testid="admin-nav-link"]');
    await expect(page).toHaveURL('/admin/login');

    // Step 2: Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/admin/players');
    await expect(page.locator('[data-testid="admin-welcome"]')).toBeVisible();

    // Step 3: Navigate to player management
    await page.click('[data-testid="manage-players-link"]');
    await expect(page).toHaveURL('/admin/players');

    // Step 4: Add players (minimum 5 required)
    const playerNames = [
      'Lionel Messi',
      'Cristiano Ronaldo',
      'Neymar Jr',
      'Kylian Mbappé',
      'Erling Haaland',
    ];

    for (const playerName of playerNames) {
      await page.fill('[data-testid="player-name-input"]', playerName);
      await page.click('[data-testid="add-player-button"]');

      // Wait for player to be added to the list
      await expect(
        page.locator(`[data-testid="player-item"]:has-text("${playerName}")`)
      ).toBeVisible();
    }

    // Verify all players are added
    await expect(page.locator('[data-testid="player-item"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="player-count"]')).toHaveText(
      '5 players'
    );

    // Step 5: Generate tournament schedule
    await page.click('[data-testid="generate-schedule-link"]');
    await expect(page).toHaveURL('/admin/schedule-generator');

    // Verify minimum players requirement is met
    await expect(
      page.locator('[data-testid="minimum-players-check"]')
    ).toHaveText('✓ Minimum 5 players requirement met');

    await page.click('[data-testid="generate-schedule-button"]');

    // Wait for schedule generation to complete
    await expect(
      page.locator('[data-testid="schedule-generation-success"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="total-matches"]')).toContainText(
      '20 matches'
    );
    await expect(page.locator('[data-testid="total-matchdays"]')).toContainText(
      '8 matchdays'
    );

    // Step 6: Navigate to match results entry
    await page.click('[data-testid="enter-results-link"]');
    await expect(page).toHaveURL('/admin/match-results');

    // Step 7: Enter results for several matches
    const matchResults = [
      { homeGoals: 3, awayGoals: 1 },
      { homeGoals: 2, awayGoals: 2 },
      { homeGoals: 1, awayGoals: 0 },
      { homeGoals: 4, awayGoals: 2 },
      { homeGoals: 0, awayGoals: 1 },
    ];

    for (let i = 0; i < matchResults.length; i++) {
      const result = matchResults[i];
      const matchRow = page.locator(`[data-testid="match-row-${i}"]`);

      await matchRow
        .locator('[data-testid="home-goals-input"]')
        .fill(result.homeGoals.toString());
      await matchRow
        .locator('[data-testid="away-goals-input"]')
        .fill(result.awayGoals.toString());
      await matchRow.locator('[data-testid="save-result-button"]').click();

      // Wait for result to be saved
      await expect(matchRow.locator('[data-testid="match-status"]')).toHaveText(
        'Completed'
      );
    }

    // Step 8: View updated standings
    await page.click('[data-testid="view-standings-link"]');
    await expect(page).toHaveURL('/standings');

    // Verify standings table is displayed with updated data
    await expect(page.locator('[data-testid="standings-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="standings-row"]')).toHaveCount(5);

    // Verify points calculation
    const firstPlace = page.locator(
      '[data-testid="standings-row"]:first-child'
    );
    await expect(firstPlace.locator('[data-testid="position"]')).toHaveText(
      '1'
    );
    await expect(firstPlace.locator('[data-testid="points"]')).not.toHaveText(
      '0'
    );

    // Step 9: Complete more matches to enable playoffs
    await page.click('[data-testid="admin-link"]');
    await page.click('[data-testid="enter-results-link"]');

    // Enter results for remaining league matches (simulate completing league phase)
    const remainingMatches = page.locator(
      '[data-testid="match-row"]:has([data-testid="match-status"]:has-text("Pending"))'
    );
    const remainingCount = await remainingMatches.count();

    for (let i = 0; i < Math.min(remainingCount, 15); i++) {
      const matchRow = remainingMatches.nth(i);
      await matchRow.locator('[data-testid="home-goals-input"]').fill('2');
      await matchRow.locator('[data-testid="away-goals-input"]').fill('1');
      await matchRow.locator('[data-testid="save-result-button"]').click();

      await expect(matchRow.locator('[data-testid="match-status"]')).toHaveText(
        'Completed'
      );
    }

    // Step 10: Generate playoff bracket
    await page.click('[data-testid="generate-playoffs-button"]');

    // Wait for playoff generation
    await expect(
      page.locator('[data-testid="playoff-generation-success"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="semifinal-matches"]')).toHaveCount(
      2
    );

    // Step 11: Enter semifinal results
    const semifinalMatches = page.locator('[data-testid="semifinal-match"]');

    for (let i = 0; i < 2; i++) {
      const match = semifinalMatches.nth(i);
      await match.locator('[data-testid="home-goals-input"]').fill('2');
      await match.locator('[data-testid="away-goals-input"]').fill('1');
      await match.locator('[data-testid="save-result-button"]').click();
    }

    // Step 12: Generate final matches
    await page.click('[data-testid="generate-final-matches-button"]');

    await expect(page.locator('[data-testid="final-match"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="third-place-match"]')
    ).toBeVisible();

    // Step 13: Complete tournament by entering final results
    await page
      .locator('[data-testid="final-match"] [data-testid="home-goals-input"]')
      .fill('3');
    await page
      .locator('[data-testid="final-match"] [data-testid="away-goals-input"]')
      .fill('2');
    await page
      .locator('[data-testid="final-match"] [data-testid="save-result-button"]')
      .click();

    await page
      .locator(
        '[data-testid="third-place-match"] [data-testid="home-goals-input"]'
      )
      .fill('1');
    await page
      .locator(
        '[data-testid="third-place-match"] [data-testid="away-goals-input"]'
      )
      .fill('0');
    await page
      .locator(
        '[data-testid="third-place-match"] [data-testid="save-result-button"]'
      )
      .click();

    // Step 14: Verify tournament completion
    await expect(
      page.locator('[data-testid="tournament-completed"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="champion"]')).toBeVisible();
    await expect(page.locator('[data-testid="runner-up"]')).toBeVisible();
    await expect(page.locator('[data-testid="third-place"]')).toBeVisible();

    // Step 15: Logout
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="admin-link"]')).toBeVisible();
  });

  test('should handle player management operations correctly', async ({
    page,
  }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Should be on player management page after login
    await expect(page).toHaveURL('/admin/players');

    // Test adding a player
    await page.fill('[data-testid="player-name-input"]', 'Test Player');
    await page.click('[data-testid="add-player-button"]');
    await expect(
      page.locator('[data-testid="player-item"]:has-text("Test Player")')
    ).toBeVisible();

    // Test duplicate player validation
    await page.fill('[data-testid="player-name-input"]', 'Test Player');
    await page.click('[data-testid="add-player-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'already exists'
    );

    // Test editing a player
    await page
      .locator(
        '[data-testid="player-item"]:has-text("Test Player") [data-testid="edit-button"]'
      )
      .click();
    await page.fill('[data-testid="edit-player-name-input"]', 'Updated Player');
    await page.click('[data-testid="save-edit-button"]');
    await expect(
      page.locator('[data-testid="player-item"]:has-text("Updated Player")')
    ).toBeVisible();

    // Test deleting a player
    await page
      .locator(
        '[data-testid="player-item"]:has-text("Updated Player") [data-testid="delete-button"]'
      )
      .click();
    await page.click('[data-testid="confirm-delete-button"]');
    await expect(
      page.locator('[data-testid="player-item"]:has-text("Updated Player")')
    ).not.toBeVisible();
  });

  test('should prevent schedule generation with insufficient players', async ({
    page,
  }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Should be on player management page after login
    await expect(page).toHaveURL('/admin/players');

    const insufficientPlayers = ['Player 1', 'Player 2', 'Player 3'];
    for (const playerName of insufficientPlayers) {
      await page.fill('[data-testid="player-name-input"]', playerName);
      await page.click('[data-testid="add-player-button"]');
    }

    // Navigate to schedule generator
    await page.click('[data-testid="generate-schedule-link"]');

    // Verify minimum players requirement is not met
    await expect(
      page.locator('[data-testid="minimum-players-check"]')
    ).toHaveText('✗ Minimum 5 players required (currently 3)');
    await expect(
      page.locator('[data-testid="generate-schedule-button"]')
    ).toBeDisabled();

    // Add 2 more players
    await page.click('[data-testid="manage-players-link"]');
    await page.fill('[data-testid="player-name-input"]', 'Player 4');
    await page.click('[data-testid="add-player-button"]');
    await page.fill('[data-testid="player-name-input"]', 'Player 5');
    await page.click('[data-testid="add-player-button"]');

    // Return to schedule generator
    await page.click('[data-testid="generate-schedule-link"]');

    // Now should be able to generate schedule
    await expect(
      page.locator('[data-testid="minimum-players-check"]')
    ).toHaveText('✓ Minimum 5 players requirement met');
    await expect(
      page.locator('[data-testid="generate-schedule-button"]')
    ).toBeEnabled();
  });

  test('should handle match result validation correctly', async ({ page }) => {
    // Setup: Login and create tournament with players
    await page.goto('/admin');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Add players and generate schedule (abbreviated setup)
    await page.click('[data-testid="manage-players-link"]');
    const players = ['P1', 'P2', 'P3', 'P4', 'P5'];
    for (const player of players) {
      await page.fill('[data-testid="player-name-input"]', player);
      await page.click('[data-testid="add-player-button"]');
    }

    await page.click('[data-testid="generate-schedule-link"]');
    await page.click('[data-testid="generate-schedule-button"]');

    // Navigate to match results
    await page.click('[data-testid="enter-results-link"]');

    const firstMatch = page.locator('[data-testid="match-row"]:first-child');

    // Test invalid inputs
    const invalidInputs = [
      { home: '-1', away: '2', error: 'non-negative' },
      { home: '2', away: '-1', error: 'non-negative' },
      { home: '1.5', away: '2', error: 'integer' },
      { home: 'abc', away: '2', error: 'number' },
    ];

    for (const input of invalidInputs) {
      await firstMatch
        .locator('[data-testid="home-goals-input"]')
        .fill(input.home);
      await firstMatch
        .locator('[data-testid="away-goals-input"]')
        .fill(input.away);
      await firstMatch.locator('[data-testid="save-result-button"]').click();

      await expect(
        page.locator('[data-testid="validation-error"]')
      ).toContainText(input.error);
    }

    // Test valid input
    await firstMatch.locator('[data-testid="home-goals-input"]').fill('3');
    await firstMatch.locator('[data-testid="away-goals-input"]').fill('1');
    await firstMatch.locator('[data-testid="save-result-button"]').click();

    await expect(firstMatch.locator('[data-testid="match-status"]')).toHaveText(
      'Completed'
    );
    await expect(
      page.locator('[data-testid="validation-error"]')
    ).not.toBeVisible();
  });

  test('should show login form correctly', async ({ page }) => {
    await page.goto('/admin/login');

    // Check login form elements are present
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

    // Test form validation - button should be disabled with empty fields
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();

    // Fill in some data
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Button should now be enabled
    await expect(page.locator('[data-testid="login-button"]')).toBeEnabled();
  });

  test('should handle session persistence correctly', async ({
    page,
    context,
  }) => {
    // Login in first session
    await page.goto('/admin');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/admin/dashboard');

    // Open new page in same context (should maintain session)
    const newPage = await context.newPage();
    await newPage.goto('/admin/players');

    // Should be able to access admin page without login
    await expect(
      newPage.locator('[data-testid="player-management-title"]')
    ).toBeVisible();

    // Logout from original page
    await page.click('[data-testid="logout-button"]');

    // New page should redirect to login
    await newPage.reload();
    await expect(newPage).toHaveURL('/admin');
  });
});

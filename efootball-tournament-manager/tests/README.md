# Testing Documentation

This document describes the comprehensive testing suite implemented for the eFootball Tournament Manager application using Playwright.

## Test Structure

The testing suite is organized into two main categories:

### Integration Tests (`tests/integration/`)

Integration tests focus on testing service interactions and business logic:

- **`player-match-service.integration.spec.ts`** - Tests coordination between PlayerService and MatchService
- **`standings-service.integration.spec.ts`** - Tests StandingsService integration with match result updates
- **`auth-admin.integration.spec.ts`** - Tests authentication flow integration with admin components
- **`firebase-service.integration.spec.ts`** - Tests Firebase service integration and error scenarios

### End-to-End Tests (`tests/e2e/`)

E2E tests cover complete user workflows and UI interactions:

- **`admin-workflow.spec.ts`** - Complete admin workflow from login to tournament completion
- **`public-user-workflow.spec.ts`** - Public user journey from viewing schedules to checking standings
- **`responsive-design.spec.ts`** - Responsive design testing across different screen sizes

## Test Utilities (`tests/helpers/`)

Common testing utilities and mock services:

- **`test-setup.ts`** - Mock services, test data factories, and utility functions

## Running Tests

### Prerequisites

1. Ensure the Angular development server is running on `http://localhost:4200`
2. Install Playwright dependencies: `npm install`

### Available Test Commands

```bash
# Run all Playwright tests
npm run test:playwright

# Run tests with UI mode (interactive)
npm run test:playwright:ui

# Run tests in headed mode (visible browser)
npm run test:playwright:headed

# Run only integration tests
npm run test:integration

# Run only end-to-end tests
npm run test:e2e

# Run all tests (Angular unit tests + Playwright)
npm run test:all
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test tests/e2e/admin-workflow.spec.ts

# Run tests matching a pattern
npx playwright test --grep "admin workflow"

# Run tests on specific browser
npx playwright test --project=chromium

# Run tests on mobile devices
npx playwright test --project="Mobile Chrome"
```

## Test Coverage

### Integration Tests Cover:

- ✅ PlayerService and MatchService coordination
- ✅ Schedule generation with player validation
- ✅ Match result updates and standings calculation
- ✅ Authentication flow and admin guard protection
- ✅ Firebase service CRUD operations and error handling
- ✅ Real-time data synchronization
- ✅ Connection status and offline scenarios

### End-to-End Tests Cover:

- ✅ Complete admin workflow (login → player management → schedule generation → match results → playoffs)
- ✅ Public user journey (home → schedule → standings)
- ✅ Player management operations (add, edit, delete, validation)
- ✅ Tournament creation and management
- ✅ Match result entry and validation
- ✅ Playoff bracket generation
- ✅ Authentication and session management
- ✅ Responsive design across 8 different viewport sizes
- ✅ Touch target validation for mobile devices
- ✅ Error handling and validation scenarios

### Responsive Design Tests Cover:

- ✅ Desktop (1920x1080, 1366x768, 1024x768)
- ✅ Tablet (1024x768 landscape, 768x1024 portrait)
- ✅ Mobile (414x896, 375x667, 320x568)
- ✅ Orientation changes
- ✅ Touch target sizes (minimum 44px)
- ✅ Text scaling and readability
- ✅ Content overflow handling
- ✅ Navigation responsiveness

## Test Data and Mocking

### Mock Services

The test suite uses comprehensive mock services that simulate:

- Firebase Firestore operations
- Firebase Authentication
- Network connectivity issues
- Error scenarios
- Real-time data updates

### Test Data Factory

The `TestDataFactory` class provides consistent test data creation:

- Players with realistic names and properties
- Matches with various states (pending, completed, playoff)
- Standings with calculated statistics
- Tournament scenarios

### Error Simulation

The `ErrorSimulationUtils` class enables testing of:

- Network errors
- Validation errors
- Authentication errors
- Timeout scenarios

## Performance Testing

The test suite includes performance validation:

- Execution time measurement
- Memory usage tracking
- Batch operation efficiency
- Concurrent operation handling

## Browser Support

Tests run on multiple browsers and devices:

- **Desktop**: Chromium, Firefox, WebKit
- **Mobile**: Mobile Chrome, Mobile Safari
- **Cross-platform**: Consistent behavior validation

## Debugging Tests

### Visual Debugging

```bash
# Run with UI mode for visual debugging
npm run test:playwright:ui

# Run in headed mode to see browser actions
npm run test:playwright:headed

# Generate and view test report
npx playwright show-report
```

### Debug Specific Issues

```bash
# Run with debug mode
npx playwright test --debug

# Run with trace viewer
npx playwright test --trace on

# Run with video recording
npx playwright test --video on
```

## Continuous Integration

The test suite is designed for CI/CD environments:

- Configurable retry logic
- Parallel execution support
- Multiple reporter options
- Screenshot and video capture on failures

## Best Practices

### Test Organization

- Tests are grouped by functionality
- Each test is independent and can run in isolation
- Common setup and teardown procedures
- Consistent naming conventions

### Data Management

- Tests use isolated mock data
- No dependencies on external services
- Predictable test scenarios
- Easy data cleanup

### Error Handling

- Comprehensive error scenario coverage
- Graceful failure handling
- Clear error messages and debugging info
- Timeout and retry mechanisms

## Requirements Validation

The test suite validates all requirements from the specification:

### Requirement 1 (Player Management)

- ✅ Player roster creation and management
- ✅ Minimum 5 players validation
- ✅ Player information storage

### Requirement 2 (Schedule Generation)

- ✅ Round-robin tournament creation
- ✅ Home and away match scheduling
- ✅ Matchday organization
- ✅ Top 4 playoff qualification

### Requirement 3 (Match Results)

- ✅ Match result entry and validation
- ✅ Automatic points calculation
- ✅ Statistics updates (wins, losses, draws, goals)
- ✅ Real-time standings updates

### Requirement 4 (Playoff System)

- ✅ Playoff bracket generation (1st vs 4th, 2nd vs 3rd)
- ✅ Final and third-place match creation
- ✅ Playoff match management

### Requirement 5 (Schedule Viewing)

- ✅ Match display by matchdays
- ✅ Match status and scores
- ✅ Playoff section separation

### Requirement 6 (Points Table)

- ✅ Comprehensive statistics display
- ✅ Sorting by points and goal difference
- ✅ Real-time updates

### Requirement 7 (Admin Security)

- ✅ Secure admin route protection
- ✅ Authentication validation
- ✅ Unauthorized access prevention

### Requirement 8 (Technical Implementation)

- ✅ Angular 19 framework usage
- ✅ Firebase Firestore integration
- ✅ Responsive design validation
- ✅ Real-time synchronization
- ✅ Loading states and error handling

## Maintenance

### Adding New Tests

1. Follow existing test structure and naming conventions
2. Use provided mock services and test utilities
3. Include both positive and negative test scenarios
4. Add appropriate assertions and error handling

### Updating Tests

1. Keep tests synchronized with application changes
2. Update mock services when interfaces change
3. Maintain test data consistency
4. Review and update documentation

### Performance Monitoring

1. Monitor test execution times
2. Optimize slow-running tests
3. Balance test coverage with execution speed
4. Regular review of test effectiveness

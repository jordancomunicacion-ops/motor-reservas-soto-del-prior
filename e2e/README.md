# End-to-End Tests

Basic end-to-end tests using Playwright for the Reservas SOTOdelPRIOR application.

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run with UI mode
```bash
npm run test:e2e:ui
```

### Run with debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/health.spec.ts
```

## Test Structure

- **health.spec.ts** - Frontend health checks and page loading tests
- **api.spec.ts** - Backend API validation and response tests

## Requirements

- Backend running on http://localhost:4000
- Frontend running on http://localhost:3001 (auto-starts with `npm run test:e2e`)

## CI/CD

Tests are configured to run in CI mode with:
- 2 retries on failure
- Single worker (no parallelization)
- HTML reports in `playwright-report/`

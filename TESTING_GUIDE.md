# Testing Framework Documentation

**Date**: 2025-11-16
**Version**: 1.0
**Status**: Testing Framework Installed ✅

---

## Overview

The DocumentiUlia.ro platform uses a comprehensive testing framework covering both backend (PHP) and frontend (React/TypeScript) components.

### Testing Stack

#### Backend Testing
- **Framework**: PHPUnit 10.5.58
- **Coverage**: Code coverage reporting with PHP Coverage
- **Database**: Separate test database (`accountech_test`)
- **Test Types**: Unit tests, Integration tests

#### Frontend Testing
- **Framework**: Vitest 4.0.9
- **Testing Library**: React Testing Library 16.3.0
- **Environment**: jsdom (simulated browser)
- **Coverage**: V8 coverage provider
- **UI**: Vitest UI for interactive test running

---

## Directory Structure

```
/var/www/documentiulia.ro/
├── tests/                              # Backend tests
│   ├── Unit/                          # Unit tests
│   │   └── InventoryProductsTest.php  # Example: Products API tests
│   ├── Integration/                   # Integration tests
│   └── setup_test_database.sql        # Test database setup
├── frontend/
│   └── src/
│       └── __tests__/                 # Frontend tests
│           ├── setup.ts               # Test configuration
│           ├── components/            # Component tests
│           └── pages/                 # Page tests
│               └── InventoryDashboard.test.tsx
├── phpunit.xml                        # PHPUnit configuration
├── frontend/vitest.config.ts          # Vitest configuration
└── coverage/                          # Generated coverage reports
```

---

## Backend Testing (PHPUnit)

### Setup Test Database

```bash
# Create test database
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d postgres -f tests/setup_test_database.sql

# Import schema from production
PGPASSWORD='AccTech2025Prod@Secure' pg_dump -h 127.0.0.1 -U accountech_app -d accountech_production --schema-only | \
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_test
```

### Running Tests

```bash
# Run all tests
./vendor/bin/phpunit

# Run specific test suite
./vendor/bin/phpunit --testsuite Unit
./vendor/bin/phpunit --testsuite Integration

# Run specific test file
./vendor/bin/phpunit tests/Unit/InventoryProductsTest.php

# Run with coverage report
./vendor/bin/phpunit --coverage-html coverage/html
```

### Writing Backend Tests

**Example Unit Test Structure:**

```php
<?php

use PHPUnit\Framework\TestCase;

class MyAPITest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Setup test fixtures
    }

    public function testSomething(): void
    {
        // Arrange
        $expected = 'value';

        // Act
        $result = someFunction();

        // Assert
        $this->assertEquals($expected, $result);
    }

    protected function tearDown(): void
    {
        // Cleanup
        parent::tearDown();
    }
}
```

### PHPUnit Configuration

Configuration is in `phpunit.xml`:
- Test suites: Unit, Integration
- Test database credentials
- Coverage reporting
- Bootstrap: `vendor/autoload.php`

---

## Frontend Testing (Vitest)

### Running Tests

```bash
cd frontend

# Run tests in watch mode
npm test

# Run tests once
npm run test:coverage

# Run with UI
npm run test:ui
```

### Writing Frontend Tests

**Example Component Test:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <MyComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('Expected Text')).toBeTruthy();
  });

  it('handles user interaction', async () => {
    const mockFn = vi.fn();
    render(<MyComponent onClick={mockFn} />);

    // Simulate interaction
    await userEvent.click(screen.getByRole('button'));

    expect(mockFn).toHaveBeenCalled();
  });
});
```

### Testing Best Practices

#### 1. **Test User Behavior, Not Implementation**
```typescript
// ❌ Bad: Testing implementation details
expect(component.state.count).toBe(5);

// ✅ Good: Testing user-visible behavior
expect(screen.getByText('Count: 5')).toBeTruthy();
```

#### 2. **Use Semantic Queries**
```typescript
// Prefer (in order):
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email')
screen.getByPlaceholderText('Enter email')
screen.getByText('Welcome')

// Avoid:
screen.getByTestId('submit-button')
```

#### 3. **Mock External Dependencies**
```typescript
// Mock fetch API
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mocked' }),
  })
);
```

#### 4. **Clean Up After Tests**
```typescript
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

---

## Test Coverage Goals

### Backend
- **Target**: 80% code coverage
- **Priority Areas**:
  - All API endpoints (100% coverage goal)
  - Authentication and authorization logic
  - Business logic (position management, risk calculations)
  - Database operations

### Frontend
- **Target**: 75% code coverage
- **Priority Areas**:
  - User interactions (forms, buttons, navigation)
  - API integration and error handling
  - Component rendering logic
  - State management

---

## Continuous Integration

### Pre-commit Checks
```bash
# Run before committing
./vendor/bin/phpunit --testsuite Unit
cd frontend && npm test
```

### CI/CD Pipeline (Planned)
1. **On Push**:
   - Run all unit tests
   - Generate coverage reports
   - Lint code

2. **On Pull Request**:
   - Run full test suite
   - Check coverage thresholds
   - Run integration tests

3. **On Merge to Main**:
   - Deploy to staging
   - Run E2E tests
   - Deploy to production (if tests pass)

---

## Current Test Status

### Backend Tests
- ✅ PHPUnit installed and configured
- ✅ Test directory structure created
- ✅ Example test file created (`InventoryProductsTest.php`)
- ⏳ Test database setup needed
- ⏳ Full API test coverage (0% currently)

### Frontend Tests
- ✅ Vitest installed and configured
- ✅ Testing Library setup complete
- ✅ Example test file created (`InventoryDashboard.test.tsx`)
- ⏳ Component test coverage (0% currently)
- ⏳ Page test coverage (0% currently)

---

## Next Steps

### Immediate (Week 1)
1. **Setup test database**
   - Create `accountech_test` database
   - Import production schema
   - Create test data fixtures

2. **Write API tests**
   - Products API (CRUD operations)
   - Stock Levels API
   - Warehouses API
   - Low Stock Alerts API
   - Stock Movement API
   - Stock Adjustment API
   - Stock Transfer API

3. **Write component tests**
   - All 5 inventory pages
   - Shared components
   - Authentication components

### Short-term (Week 2-3)
4. **Integration tests**
   - End-to-end workflows
   - Multi-step operations
   - Error scenarios

5. **Coverage analysis**
   - Generate coverage reports
   - Identify untested code
   - Write tests to improve coverage

### Medium-term (Month 2)
6. **E2E tests**
   - Playwright or Cypress setup
   - Critical user journeys
   - Cross-browser testing

7. **Performance tests**
   - API response times
   - Database query optimization
   - Frontend rendering performance

---

## Testing Commands Reference

### Backend
```bash
# Run all tests
./vendor/bin/phpunit

# Run with coverage
./vendor/bin/phpunit --coverage-html coverage/html

# Run specific test
./vendor/bin/phpunit tests/Unit/InventoryProductsTest.php

# Run with verbose output
./vendor/bin/phpunit --verbose

# Run with filter
./vendor/bin/phpunit --filter testProductCreation
```

### Frontend
```bash
# Watch mode
npm test

# Single run with coverage
npm run test:coverage

# UI mode
npm run test:ui

# Run specific file
npm test -- InventoryDashboard.test.tsx

# Update snapshots
npm test -- -u
```

---

## Troubleshooting

### Backend Issues

**Issue**: Tests fail with database connection error
```bash
# Solution: Check database credentials in phpunit.xml
# Ensure test database exists
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_test -c "SELECT 1"
```

**Issue**: Autoloader not finding classes
```bash
# Solution: Regenerate autoload files
composer dump-autoload
```

### Frontend Issues

**Issue**: Tests fail with "Cannot find module"
```bash
# Solution: Reinstall dependencies
cd frontend
npm install
```

**Issue**: Tests hang indefinitely
```bash
# Solution: Check for unresolved promises, add timeout
it('test name', async () => {
  // ...
}, { timeout: 5000 })
```

---

## Resources

### Documentation
- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Internal Docs
- [Inventory Module Status](INVENTORY_MODULE_STATUS.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Platform Strategy](PLATFORM_OVERALL_IMPROVEMENT_STRATEGY.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Maintained By**: Development Team

---

*This testing framework ensures code quality and reliability as the platform scales to support additional modules and features.*

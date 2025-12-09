# AgentWorks Testing Guide

This guide covers the comprehensive testing suite for the AgentWorks platform MVP, including unit tests, integration tests, end-to-end tests, performance tests, and security tests.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Quick Start](#quick-start)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Overview

The AgentWorks testing suite provides comprehensive coverage for:

- **5 Backend Microservices**: Core Service, Agent Orchestrator, Provider Router, Log Streaming, Billing Service
- **Frontend React Application**: Components, hooks, stores, and user interactions
- **Service Integration**: Cross-service communication and data flow
- **End-to-End Workflows**: Complete user journeys from Lane 0 to Lane 1
- **Performance & Scalability**: Load testing and performance benchmarks
- **Security & Authentication**: Security vulnerabilities and access control

## Test Structure

```
/AgentWorks
├── jest.config.js                    # Main Jest configuration
├── tests/
│   ├── setup/                        # Test setup and utilities
│   │   ├── backend.ts                # Backend test setup
│   │   ├── frontend.ts               # Frontend test setup  
│   │   ├── integration.ts            # Integration test setup
│   │   └── e2e.ts                    # E2E test setup
│   ├── mocks/
│   │   └── server.ts                 # MSW mock server
│   ├── fixtures/                     # Test data fixtures
│   ├── integration/                  # Integration tests
│   ├── e2e/                         # End-to-end tests
│   ├── performance/                  # Performance tests
│   └── security/                     # Security tests
├── apps/
│   ├── core-service/tests/          # Core service unit tests
│   ├── agent-orchestrator/tests/    # Agent orchestrator tests
│   ├── provider-router/tests/       # Provider router tests
│   ├── log-streaming/tests/          # Log streaming tests
│   ├── billing-service/tests/       # Billing service tests
│   └── web/tests/                   # Frontend tests
└── scripts/
    └── test/                        # Test utility scripts
```

## Quick Start

### 1. Setup Test Environment

```bash
# Run the automated test setup
./scripts/test-setup.sh
```

This script will:
- Start PostgreSQL and Redis test containers
- Install dependencies and build packages
- Create test databases
- Generate test environment configuration
- Validate the setup

### 2. Run All Tests

```bash
# Run the complete test suite
pnpm test

# Or use the utility script
./scripts/test/run-all.sh
```

### 3. Run Specific Test Types

```bash
# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# End-to-end tests  
pnpm test:e2e

# Performance tests
pnpm test:performance

# Security tests
pnpm test:security
```

## Test Types

### Unit Tests

Tests individual components, functions, and modules in isolation.

**Backend Services:**
- Route handlers with mocked dependencies
- Business logic functions
- Database operations with test database
- Authentication and authorization
- Error handling

**Frontend Components:**
- React component rendering
- User interactions and events
- State management (Zustand stores)
- API integration with MSW mocks
- Form validation and submission

**Example locations:**
- `/apps/core-service/tests/unit/`
- `/apps/web/tests/unit/components/`

### Integration Tests

Tests service-to-service communication and data flow across the system.

**Test scenarios:**
- Core Service ↔ Agent Orchestrator communication
- Agent Orchestrator ↔ Provider Router requests
- Log Streaming service message flow
- Billing Service usage tracking
- Multi-service error handling
- Authentication across services

**Example:** `/tests/integration/service-communication.test.ts`

### End-to-End Tests

Tests complete user workflows using Puppeteer with real browser automation.

**Lane 0-1 Workflow Tests:**
1. User registration and workspace creation
2. Strategic vision card creation in Lane 0
3. CEO CoPilot agent execution
4. Card transition from Lane 0 to Lane 1
5. PRD Agent execution in Lane 1
6. Complete workflow validation

**Features tested:**
- User authentication flow
- Kanban board interactions
- Drag and drop functionality
- Agent execution with terminal output
- Real-time WebSocket communication
- Usage tracking and billing

**Example:** `/tests/e2e/lane-0-1-workflow.test.ts`

### Performance Tests

Load testing and performance benchmarks for system scalability.

**Test scenarios:**
- Concurrent user authentication (50+ users)
- High-volume card creation and retrieval
- Multiple simultaneous agent executions
- WebSocket connection scaling (20+ connections)
- Database query performance under load
- Service response time benchmarks

**Metrics tracked:**
- Request/response times (average, 95th percentile, 99th percentile)
- Throughput (requests per second)
- Success/failure rates
- Resource utilization
- Agent execution performance and token usage

**Example:** `/tests/performance/load-testing.test.ts`

### Security Tests

Authentication, authorization, and security vulnerability testing.

**Security aspects:**
- JWT token validation and expiration
- SQL injection prevention
- XSS protection and input sanitization
- Cross-tenant data isolation
- API rate limiting
- Agent prompt injection prevention
- CORS and security headers

**Example:** `/tests/security/authentication.test.ts`

## Running Tests

### Development

```bash
# Watch mode for rapid development
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- --testPathPattern="auth.test.ts"

# Run tests for specific service
pnpm test:unit --selectProjects core-service
```

### Individual Test Suites

```bash
# Backend service unit tests
pnpm test:unit --selectProjects core-service agent-orchestrator provider-router log-streaming billing-service

# Frontend component tests  
pnpm test:unit --selectProjects web

# Integration tests with service startup
./scripts/test/run-integration.sh

# E2E tests with full stack
./scripts/test/run-e2e.sh
```

### Environment Variables

Test configuration via `.env.test`:

```bash
# Database
DATABASE_URL=postgresql://test:test@localhost:5432/agentworks_test
REDIS_URL=redis://localhost:6379/1

# Authentication
JWT_SECRET=test-jwt-secret

# Service ports
PORT_CORE=9000
PORT_ORCHESTRATOR=9001
# ... etc

# API keys (use test/mock keys)
OPENAI_API_KEY=test-openai-key
ANTHROPIC_API_KEY=test-anthropic-key
```

## CI/CD Integration

### GitHub Actions Workflows

**Main Test Pipeline (`.github/workflows/test.yml`):**
- Triggered on push to main/develop and PRs
- Runs all test suites in parallel
- Includes PostgreSQL and Redis services
- Uploads test artifacts and coverage reports
- Generates deployment readiness check

**PR Checks (`.github/workflows/pr-checks.yml`):**
- Quick validation for pull requests
- Linting, type checking, security audit
- Build verification
- Quick unit tests for changed files
- PR size and dependency change validation

### Test Stages

1. **Setup**: Install dependencies, build packages, setup databases
2. **Unit Tests**: Parallel execution by service
3. **Integration Tests**: Service communication testing
4. **E2E Tests**: Full workflow testing with browser automation
5. **Performance Tests**: Load testing (main branch only)
6. **Security Tests**: Vulnerability and authentication testing
7. **Coverage Report**: Merge and upload coverage data

### Coverage Requirements

**Global coverage thresholds:**
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Service-specific requirements:**
- Core Service: 80% (critical authentication/authorization)
- Agent Orchestrator: 75% (complex execution logic)
- Frontend Components: 70% (user interaction focus)

## Best Practices

### Writing Tests

1. **Arrange, Act, Assert**: Structure tests clearly
2. **Descriptive names**: Test names should explain what they verify
3. **Isolated tests**: Each test should be independent
4. **Mock external dependencies**: Use MSW for API mocking
5. **Test edge cases**: Error conditions, boundary values
6. **Use data-testid**: For reliable element selection in E2E tests

### Test Data Management

```typescript
// Use factories for test data
export async function createTestUser(overrides: Partial<User> = {}) {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: await hashPassword('password123'),
      ...overrides,
    },
  });
}
```

### Performance Testing

- Set realistic load targets based on expected usage
- Monitor both success rates and response times
- Test critical user journeys under load
- Establish performance baselines for regression testing

### E2E Testing

- Use Page Object Model for maintainable tests
- Take screenshots for debugging failed tests
- Test critical paths thoroughly, less critical paths lightly
- Handle async operations properly with proper waits

### Security Testing

- Test with malicious input payloads
- Verify proper error messages (no sensitive data leakage)
- Test authentication boundaries thoroughly
- Validate authorization for all user roles

## Troubleshooting

### Common Issues

**Database connection errors:**
```bash
# Restart test database
docker restart agentworks-postgres-test
```

**Redis connection errors:**
```bash
# Restart test Redis
docker restart agentworks-redis-test
```

**Port conflicts:**
```bash
# Check what's using the port
lsof -i tcp:5432

# Kill conflicting processes
pkill -f postgres
```

**E2E test failures:**
```bash
# Check screenshots for visual debugging
ls tests/e2e/screenshots/

# Run E2E tests with browser visible
HEADLESS=false pnpm test:e2e
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* pnpm test

# Run single test with full output
pnpm test -- --testNamePattern="specific test" --verbose
```

### Clean Reset

```bash
# Complete environment reset
./scripts/test/cleanup.sh
./scripts/test-setup.sh
```

## Continuous Improvement

The testing suite is designed to grow with the platform:

1. **Add tests for new features** immediately when implementing
2. **Update performance baselines** as the system scales
3. **Expand E2E coverage** for new user workflows
4. **Add security tests** for new attack vectors
5. **Monitor test execution time** and optimize slow tests

For questions or issues with the testing suite, please check the existing test files for examples or consult the development team.
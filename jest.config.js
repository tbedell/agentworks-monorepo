module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: [
    // Backend services
    {
      displayName: 'core-service',
      testMatch: ['<rootDir>/apps/core-service/tests/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: './apps/core-service/tsconfig.json'
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/core-service/src/$1',
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src'
      }
    },
    {
      displayName: 'agent-orchestrator',
      testMatch: ['<rootDir>/apps/agent-orchestrator/tests/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: './apps/agent-orchestrator/tsconfig.json'
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/agent-orchestrator/src/$1',
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src'
      }
    },
    {
      displayName: 'provider-router',
      testMatch: ['<rootDir>/apps/provider-router/tests/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: './apps/provider-router/tsconfig.json'
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/provider-router/src/$1',
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src'
      }
    },
    {
      displayName: 'log-streaming',
      testMatch: ['<rootDir>/apps/log-streaming/tests/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: './apps/log-streaming/tsconfig.json'
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/log-streaming/src/$1',
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src'
      }
    },
    {
      displayName: 'billing-service',
      testMatch: ['<rootDir>/apps/billing-service/tests/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: './apps/billing-service/tsconfig.json'
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/billing-service/src/$1',
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src'
      }
    },
    // Frontend
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/tests/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/frontend.ts'],
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          useESM: true,
          tsconfig: './apps/web/tsconfig.json'
        }]
      },
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/web/src/$1',
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      }
    },
    // Integration tests
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.ts'],
      testEnvironment: 'node',
      testTimeout: 30000,
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^@agentworks/(.*)$': '<rootDir>/packages/$1/src'
      }
    },
    // End-to-end tests
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.ts'],
      testEnvironment: 'node',
      testTimeout: 60000,
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true
        }]
      },
      extensionsToTreatAsEsm: ['.ts']
    }
  ],
  collectCoverageFrom: [
    'apps/*/src/**/*.{ts,tsx}',
    'packages/*/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
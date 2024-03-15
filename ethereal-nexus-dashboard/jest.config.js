const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    './**/*.([j|t]s?(x))',
    '!node_modules/**',
    '!coverage/**',
    '!.next/**',
    '!.husky/**',
    '!next.config.js',
    '!jest.config.js',
    '!next-i18next.config.js',
    '!jest.setup.js',
    '!src/utils/constants/**',
    '!src/utils/mocks/**',
    '!src/components/ui/icon/**',
    '!src/utils/functions/ut-helper.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'html', 'text'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: ['/node_modules/', '^.+\\.module\\.(css|sass|scss)$'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^next-auth$': '<rootDir>/src/auth',
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    './**/*.([j|t]s?(x))',
    '!node_modules/**',
    '!coverage/**',
    '!.next/**',
    '!next.config.js',
    '!jest.config.js',
    '!jest.setup.js',
    '!src/components/ui/**',
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

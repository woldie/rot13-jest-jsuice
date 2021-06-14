process.env.NODE_ENV = 'unit'; // force it to load the .env.unit configs here
const dotenv = require('dotenv-flow');
dotenv.config();

module.exports = {
  bail: true,
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  modulePathIgnorePatterns: [
    '<rootDir>/src/integration',
    '<rootDir>/src/smoke',
  ],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/src/integration'],
  moduleDirectories: ['node_modules', 'src'],
  collectCoverage: true,
  coverageDirectory: 'reports/unit',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/App.js', // entry point module not covered, hard to test, so keep it simple
    '!src/**/*.test.js',
    '!src/integration/globalSetup.js',
    '!src/integration/globalTeardown.js'
  ],
  coverageReporters: [
    'json-summary', // coverage summary
    'lcov', // html summary
    'html', // html summary
    'text', // output to console
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  reporters: ['default'],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',
};

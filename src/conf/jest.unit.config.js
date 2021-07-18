process.env.NODE_ENV = 'unit'; // force it to load the .env.unit configs here
const dotenv = require('dotenv-flow');
dotenv.config();

module.exports = {
  bail: true,
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.unit.setup.js'],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/src'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/unit',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js',
    '!<rootDir>/src/rot13-service/AdminServer.js', // entry point module not covered, hard to test, so keep it simple
    '!<rootDir>/src/rot13-service/Rot13Server.js', // entry point module not covered, hard to test, so keep it simple
    '!<rootDir>/src/**/*.test.js',
    '!<rootDir>/src/**/*.functional.js',
    '!<rootDir>/src/conf/**/*.js',
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

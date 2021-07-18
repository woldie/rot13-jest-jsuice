module.exports = {
  clearMocks: true,
  testTimeout: 100000,
  moduleFileExtensions: ['js'],
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.integration.js'],
  globalSetup: '<rootDir>/jest.integration.globalSetup.js',
  globalTeardown: '<rootDir>/jest.integration.globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/src'],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',

  // rely on the separate nyc call in express process to collect coverage, see src/integration/globalSetup.ts
  collectCoverage: false,
};

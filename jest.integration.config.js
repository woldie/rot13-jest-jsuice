module.exports = {
  clearMocks: true,
  testTimeout: 100000,
  moduleFileExtensions: ['js'],
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.integration.js'],
  globalSetup: './src/integration/globalSetup.js',
  globalTeardown: './src/integration/globalTeardown.js',
  setupFilesAfterEnv: ['./src/integration/setup.js'],
  moduleDirectories: ['node_modules', 'src'],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',

  // rely on the separate nyc call in express process to collect coverage, see src/integration/globalSetup.ts
  collectCoverage: false,
};

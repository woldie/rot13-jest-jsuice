module.exports = {
  clearMocks: true,
  testTimeout: 100000,
  moduleFileExtensions: ['js'],
  roots: [`${__dirname}/..`],
  testEnvironment: 'node',
  testMatch: [`**/*.functional.js`],
  globalSetup: `${__dirname}/jest.functional.globalSetup.js`,
  globalTeardown: `${__dirname}/jest.functional.globalTeardown.js`,
  setupFilesAfterEnv: ['jest-expect-message', `${__dirname}/jest.functional.setup.js`],
  moduleDirectories: [`${__dirname}/../../node_modules`, `${__dirname}/..`],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',

  // rely on the separate nyc call in express process to collect coverage, see src/integration/globalSetup.ts
  collectCoverage: false,
};

module.exports = {
  clearMocks: true,
  setupFiles: [],
  moduleFileExtensions: ['js', 'json'],
  roots: [`${__dirname}/..`],
  testEnvironment: 'node',
  testMatch: [`${__dirname}/../**/*.test.js`],
  moduleDirectories: [`${__dirname}/../../node_modules`, `${__dirname}/..`],
  collectCoverage: false,
  reporters: ['default'],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',
};

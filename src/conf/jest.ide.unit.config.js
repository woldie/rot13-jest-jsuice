module.exports = {
  clearMocks: true,
  setupFiles: [],
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/rc'],
  collectCoverage: false,
  reporters: ['default'],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',
};

module.exports = {
  clearMocks: true,
  setupFiles: [],
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  modulePathIgnorePatterns: [
    '<rootDir>/src/integration',
  ],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/src/integration'],
  moduleDirectories: ['node_modules', 'src'],
  collectCoverage: false,
  reporters: ['default'],

  // bails on the build completely if lifecycle hooks like beforeAll throw
  testRunner: 'jest-circus/runner',
};

process.env.NODE_ENV = 'unit'; // force it to load the .env.unit configs here
const dotenv = require('dotenv-flow');
dotenv.config();

module.exports = {
  bail: true,
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  roots: [`${__dirname}/..`],
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['jest-expect-message', `${__dirname}/jest.unit.setup.js`],
  moduleDirectories: [`${__dirname}/../../node_modules`, `${__dirname}/..`],
  collectCoverage: true,
  coverageDirectory: `${__dirname}/../../reports/unit`,
  collectCoverageFrom: [
    `${__dirname}/../**/*.js`,
    `!${__dirname}/../serve.js`, // entry point module not covered, hard to test, so keep it simple
    `!${__dirname}/../**/*.test.js`,
    `!${__dirname}/../**/*.functional.js`,
    `!${__dirname}/../**/*.unctional.js`,
    `!${__dirname}/**/*.js`,
    `!${__dirname}/../**/testScripts/*.js`,
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

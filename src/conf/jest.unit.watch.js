const jestUnitTestConfigs = require('./jest.unit.config');

module.exports = { ...jestUnitTestConfigs,
  collectCoverage: false,
  bail: false,
  verbose: false,
  reporters: [
    `${__dirname}/testUtilities/WatchFriendlyReporter.js`,
    [
      `${__dirname}../../node_modules/jest-reporter`,
      {
        passSound: `${__dirname}/sounds/unit_pass.wav`,
        failSound: `${__dirname}/sounds/unit_fail.wav`,
        skipFailSound: false,
        skipFailText: true,
        skipPassSound: false,
        skipPassText: true,
      }
    ]
  ]
};

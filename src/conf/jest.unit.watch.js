const jestUnitTestConfigs = require('./jest.unit.config');

module.exports = { ...jestUnitTestConfigs,
  collectCoverage: false,
  bail: false,
  verbose: false,
  reporters: [
    `${__dirname}/testUtilities/WatchFriendlyReporter.js`,
    [
      `${__dirname}/../../node_modules/jest-reporter`,
      {
        passSound: 'src/conf/sounds/unit_pass.wav',
        failSound: 'src/conf/sounds/unit_fail.wav',
        skipFailText: true,
        skipPassText: true
      }
    ]
  ]
};

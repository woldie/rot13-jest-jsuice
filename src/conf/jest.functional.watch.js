const jestIntegrationTestConfigs = require('./jest.functional.config');

module.exports = { ...jestIntegrationTestConfigs,
  bail: false,
  reporters: [
    `${__dirname}/testUtilities/WatchFriendlyReporter.js`,
    [
      `${__dirname}/../../node_modules/jest-reporter`,
      {
        passSound: `src/conf/sounds/functional_pass.wav`,
        failSound: `src/conf/sounds/functional_fail.wav`,
        skipPassText: true,
        skipFailText: true
      }
    ]
  ]
};

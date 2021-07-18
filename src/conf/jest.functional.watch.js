const jestIntegrationTestConfigs = require('./jest.functional.config');

module.exports = { ...jestIntegrationTestConfigs,
  bail: false,
  reporters: [
    'default',
    [
      `${__dirname}/../../node_modules/jest-reporter`,
      {
        passSound: `${__dirname}/sounds/functional_pass.wav`,
        failSound: `${__dirname}/sounds/functional_fail.wav`,
        skipFailSound: false,
        skipFailText: true,
        skipPassSound: false,
        skipPassText: true,
      }
    ]
  ]
};

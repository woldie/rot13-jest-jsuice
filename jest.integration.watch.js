const jestIntegrationTestConfigs = require('./jest.integration.config');

module.exports = { ...jestIntegrationTestConfigs,
  bail: false,
  reporters: [
    'default',
    [
      './node_modules/jest-reporter',
      {
        passSound: './sounds/functional_pass.wav',
        failSound: './sounds/functional_fail.wav',
        skipFailSound: false,
        skipFailText: true,
        skipPassSound: false,
        skipPassText: true,
      }
    ]
  ]
};

const jestUnitTestConfigs = require('./jest.unit.config');

module.exports = { ...jestUnitTestConfigs,
  collectCoverage: false,
  bail: false,
  verbose: false,
  reporters: [
    'default',
    [
      './node_modules/jest-reporter',
      {
        passSound: './sounds/unit_pass.wav',
        failSound: './sounds/unit_fail.wav',
        skipFailSound: false,
        skipFailText: true,
        skipPassSound: false,
        skipPassText: true,
      }
    ]
  ]
};

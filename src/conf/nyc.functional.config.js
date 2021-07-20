// Istanbul coverage configs.  Used in jest.functional.globalSetup.js

module.exports = {
  cwd: `${__dirname}/..`,
  'temp-dir': '../.nyc_functional_temp',
  'report-dir': '../reports/functional',

  cache: false,
  'check-coverage': !process.env.CONFIG_FILE || !/watch/.test(process.env.CONFIG_FILE),
  exclude: [
    '**/*.functional.js',
    '**/*.test.js',
  ],
  reporter: ['json-summary', 'lcov', 'html', 'text'],

  // Global coverage minimum percentage thresholds for functional tests
  branches: 0,
  lines: 0,
  functions: 0,
  statements: 0,
};

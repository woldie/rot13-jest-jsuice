// Istanbul coverage configs.  Used in src/integration/globalSetup.ts

module.exports = {
  cwd: `${__dirname}/..`,
  'temp-dir': '.nyc_integration_temp',
  'report-dir': 'reports/integration',

  cache: false,
  'check-coverage': !process.env.CONFIG_FILE || !/watch/.test(process.env.CONFIG_FILE),
  exclude: [
    'integration/**',
    'smoke/**',
    'client/**',
    '**/*.test.js',
  ],
  reporter: ['json-summary', 'lcov', 'html', 'text'],

  // Global coverage minimum percentage thresholds for integration tests
  branches: 0,
  lines: 0,
  functions: 0,
  statements: 0,
};

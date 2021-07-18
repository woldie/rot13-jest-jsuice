/* eslint-disable no-useless-constructor,prefer-rest-params */
// noinspection JSCheckFunctionSignatures

const { DefaultReporter } = require('@jest/reporters');

/**
 * Make the default Jest reporter less chatty, which makes diagnosing test failures easier when looking at the console
 * after the test run finishes while running tests in watch mode.
 */
class Reporter extends DefaultReporter {
  constructor() {
    super(...arguments);
  }

  printTestFileHeader(_testPath, config, result) {
    const {console} = result;

    if (result.numFailingTests === 0 && !result.testExecError) {
      result.console = null;
    }

    super.printTestFileHeader(...arguments);

    result.console = console;
  }
}

module.exports = Reporter;

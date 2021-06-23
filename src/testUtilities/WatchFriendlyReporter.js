/* eslint-disable no-useless-constructor,prefer-rest-params */
// noinspection JSCheckFunctionSignatures

const { DefaultReporter } = require('@jest/reporters');

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

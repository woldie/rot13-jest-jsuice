const trim = require("lodash.trim");

/**
 * @package
 */
class InjectorUtils {
  /**
   * @private
   */
  constructor() {
    throw new Error("Do not call");
  }

  static getFunctionSignature(ftn) {
    const ftnString = trim(`${ftn}`);
    const groups = /([^(]*\([^)]*\))\s*(=>|{)/.exec(ftnString);

    if (groups !== null) {
      return trim(groups[1]);
    }

    // just take everything before the first curly brace if the complex regex doesn't work
    return trim(ftnString.split("{")[0]);
  }
}

module.exports = InjectorUtils;

const injector = require('../../jsuice');

/**
 * Returns the current NodeJS process
 *
 * @returns {NodeJS.Process} current process
 */
function providerFunction() {
  return process;
}

module.exports = injector.createProvider(providerFunction, injector.Flags.INFRASTRUCTURE);

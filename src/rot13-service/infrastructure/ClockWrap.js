/* eslint-disable no-unused-vars */
const injector = require('../../jsuice');

/**
 * @typedef {Object} ClockWrap
 * @property {typeof Date} Date
 * @property {typeof Intl.DateTimeFormat} DateTimeFormat
 * @property {function(fn:Function,timeoutMsec:Number):NodeJS.Timeout} setTimeout
 * @property {function(timeoutToken:NodeJS.Timeout)} clearTimeout
 * @property {function(msec:Number):Promise<Number>} advanceMockAsync
 * @property {function():Promise<Number>} advanceMockTimersAsync
 */

/**
 * Provider function for NodeJS clock functions.
 *
 * @returns {ClockWrap}
 */
function providerFunction() {
  return /** @type {ClockWrap} */ {
    Date,
    DateTimeFormat: Intl.DateTimeFormat,
    setTimeout,
    clearTimeout,
    advanceMockAsync(msec) { throw new Error("Can't advance the clock because it isn't a mock clock"); },
    advanceMockTimersAsync() { throw new Error("Can't advance the clock because it isn't a mock clock"); }
  }
}

module.exports = injector.createProvider(providerFunction, injector.Flags.INFRASTRUCTURE);

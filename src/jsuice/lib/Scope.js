const forEach = require('lodash.foreach');

/**
 * Numeric digit strings matching the scope flags in Injector.
 *
 * @enum {Number}
 * @readonly
 * @public
 *
 * @property {Scope} SINGLETON
 * @property {Scope} APPLICATION
 * @property {Scope} PROTOTYPE
 */
const Scope = {};

forEach({
  'SINGLETON': 8192,
  'APPLICATION': 16384,
  'PROTOTYPE': 32768
}, (value, key) => {
  Object.defineProperty(Scope, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value
  });
});

module.exports = Scope;

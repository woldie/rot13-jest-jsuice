const forEach = require('lodash.foreach');

/**
 * Numeric digit strings matching the scope flags in Injector.
 *
 * @enum {Number}
 * @readonly
 * @public
 *
 * @property {Number} SINGLETON
 * @property {Number} APPLICATION
 * @property {Number} PROTOTYPE
 */
const Scope = {};

forEach({
  'SINGLETON': 1,
  'APPLICATION': 2,
  'PROTOTYPE': 4
}, (value, key) => {
  Object.defineProperty(Scope, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value
  });
});

module.exports = Scope;

const forEach = require('lodash.foreach');

/**
 * Numeric digit strings matching the scope flags in Injector.
 *
 * @enum {Number}
 * @readonly
 * @public
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

/**
 * @name Scope.SINGLETON
 * @public
 * @const
 */

/**
 * @name Scope.APPLICATION
 * @public
 * @const
 */

/**
 * @name Scope.PROTOTYPE
 * @public
 * @const
 */

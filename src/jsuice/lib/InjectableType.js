const forEach = require('lodash.foreach');

/**
 * @enum {string}
 * @readonly
 * @public
 */
const InjectableType = {};

forEach({
  'INJECTED_CONSTRUCTOR': 'c',
  'OBJECT_INSTANCE': 'o',
  'PROVIDER': 'f'
}, (value, key) => {
  Object.defineProperty(InjectableType, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value
  });
});

module.exports = InjectableType;

/**
 * @name InjectableType.INJECTED_CONSTRUCTOR
 * @public
 * @const
 */

/**
 * @name InjectableType.OBJECT_INSTANCE
 * @public
 * @const
 */

/**
 * @name InjectableType.PROVIDER
 * @public
 * @const
 */

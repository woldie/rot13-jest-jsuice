const forEach = require('lodash.foreach');

/**
 * @enum {string}
 * @readonly
 * @public
 *
 * @property {String} INJECTED_CONSTRUCTOR
 * @property {String} OBJECT_INSTANCE
 * @property {String} PROVIDER
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

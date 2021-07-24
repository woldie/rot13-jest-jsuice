const forEach = require('lodash.foreach');

/**
 * Supported runtime environments for J'suice injector-powered testing.
 *
 * @enum {Number}
 * @readonly
 * @public
 *
 * @property {InjectorEnvironment} SOCIABLE When run in SOCIABLE environment, j'suice INFRASTRUCTURE injectables are
 * instantiated as mocks
 * @property {InjectorEnvironment} INTEGRATION When run in INTEGRATION environment, j'suice INFRASTRUCTURE injectables
 * are instantiated as partial mocks
 * @property {InjectorEnvironment} STAGING When run in STAGING environment, j'suice INFRASTRUCTURE injectables are
 * instantiated as partial mocks
 * @property {InjectorEnvironment} TEST When run in TEST environment, j'suice INFRASTRUCTURE injectables are
 * instantiated as partial mocks
 * @property {InjectorEnvironment} PROD When run in PROD environment, j'suice INFRASTRUCTURE injectables are
 * instantiated as partial mocks
 */
const InjectorEnvironment = {};

forEach({
  /**
   *
   */
  'SOCIABLE': 1,
  'FUNCTIONAL': 2,
  'STAGING': 3,
  'TEST': 4,
  'PROD': 5
}, (value, key) => {
  Object.defineProperty(InjectorEnvironment, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value
  });
});

module.exports = InjectorEnvironment;

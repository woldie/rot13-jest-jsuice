const forEach = require('lodash.foreach');

/**
 * Injectable creation flags.
 *
 * @enum {Number}
 * @readonly
 * @public
 * @property {Number} BOUNDARY The boundary flag indicates that a module marks a boundary or integration point within
 * your software system.  During testing, modules marked with the boundary flag will automatically be instantiated as
 * a testdouble mock unless the boundary module is also selected as the system under test.
 * @property {Number} EAGER The eager flag indicates that an injectable should be instantiated as soon as the injector
 * is able.
 */
const Flags = {};

forEach({
  'BOUNDARY': 64,
  'EAGER': 128
}, (value, key) => {
  Object.defineProperty(Flags, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value
  });
});

module.exports = Flags;


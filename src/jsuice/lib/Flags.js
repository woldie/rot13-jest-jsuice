const forEach = require('lodash.foreach');

/**
 * Injectable creation flags.
 *
 * @enum {Number}
 * @readonly
 * @public
 * @property {Number} INFRASTRUCTURE The infrastructure flag indicates that a module marks an infrastructure point, or
 * integration point within your software system to another software system.  During test runs, injectables marked with
 * the {@link #INFRASTRUCTURE} flag will automatically be instantiated with all of its enumerable methods replaced with
 * testdouble mocks unless the infrastructure injectable is also selected to be system under test by
 * {@link Injector#collaborators}.  The type of testdouble mock created depends on the JSUICE_ENV environment variable
 * setting.  If the <code>JSUICE_ENV</code> environment variable is set to <code>sociable</code>, then all
 * {@link #INFRASTRUCTURE} injectables will be instantiated with fully mocked enumerable methods.  Any other
 * <code>JSUICE_ENV</code> setting (see {@link InjectorEnvironment} for all possible values) will cause
 * {@link #INFRASTRUCTURE} injectables to be instantiated with partially-mocked enumerable methods:  spies that proxy
 * to the 'real' function they are set to mock by default unless configured otherwise in {@link Injector#collaborators}
 * or {@link Injector#environmentSetup}.)
 * @property {Number} EAGER The eager flag indicates that an injectable should be instantiated as soon as the injector
 * is able.
 */
const Flags = {};

forEach({
  'INFRASTRUCTURE': 256,
  'EAGER': 512
}, (value, key) => {
  Object.defineProperty(Flags, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value
  });
});

module.exports = Flags;


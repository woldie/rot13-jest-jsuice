/* eslint-disable no-unused-vars */
/**
 * Base class for all Providers.
 *
 * @abstract
 */
class Provider {
  /**
   * @param {!Array.<String>} dependencies
   * @param {!Number} numberOfUserSuppliedArgs
   */
  constructor(dependencies, numberOfUserSuppliedArgs) {
    /**
     * The names of injectables that will be instantiated for the module when it is instantiated.
     * @name Provider#dependencies
     * @type {Array.<String>}
     */
    this.dependencies = dependencies;

    /**
     * The expected number of additional arguments that are expcted to be passed to createInstance
     * by the {@link Injector} that will be supplied by the end-user.
     *
     * @name Provider#numberOfUserSuppliedArgs
     * @type {Number}
     */
    this.numberOfUserSuppliedArgs = numberOfUserSuppliedArgs;
  }
}

/**
 * Internal factory function called by the Injector.  Must be overridden by subclasses.
 *
 * @name Provider#__createInstance
 * @param {...*} allArgs injected args followed by user-supplied args
 * @abstract
 */
Object.defineProperty(Provider.prototype, "__createInstance", {
  value(allArgs) {
    throw new Error("abstract base");
  },
  enumerable: false,
  writable: true
});

module.exports = Provider;

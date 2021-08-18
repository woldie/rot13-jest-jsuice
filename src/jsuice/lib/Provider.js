/* eslint-disable no-unused-vars */

/**
 * Base class for all Providers.
 *
 * @abstract
 */
class Provider {
  /**
   * @param {!Array.<(String|Instancer)>} dependencies
   * @param {!Array.<InjectedParamType>} injectedParamTypes
   * @param {!Number} numberOfUserSuppliedArgs
   */
  constructor(dependencies, injectedParamTypes, numberOfUserSuppliedArgs) {
    /**
     * The names of injectables that will be instantiated for the module when it is instantiated.
     * @name Provider#dependencies
     * @type {!Array.<(String|Instancer)>}
     */
    this.dependencies = dependencies;

    /**
     * @name Provider#injectedParamTypes
     * @type {!Array.<InjectedParamType>}
     */
    this.injectedParamTypes = injectedParamTypes;

    /**
     * The expected number of additional arguments that are expcted to be passed to createInstance
     * by the {@link Injector} that will be supplied by the end-user.
     *
     * @name Provider#numberOfUserSuppliedArgs
     * @type {!Number}
     */
    this.numberOfUserSuppliedArgs = numberOfUserSuppliedArgs;
  }
}

module.exports = Provider;

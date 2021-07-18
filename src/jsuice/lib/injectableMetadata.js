/* eslint-disable no-unused-vars */

const InjectorUtils = require('./InjectorUtils');
const Provider = require('./Provider');
const InjectedParamType = require('./InjectedParamType');

/**
 * @typedef {{scope: Scope, eager: Boolean, flags: Number, injectedParams: Array.<String|FactoryFunction>, injectedParamTypes: Array.<InjectedParamType>, numberOfUserSuppliedArgs: Number=}} InjectableMetadata.Collection
 */

/**
 * @package
 */
class InjectableMetadata {
  constructor() {
    /**
     * @name InjectableMetadata#metaMap
     * @type {WeakMap.<*, any>}
     */
    this.metaMap = new WeakMap();

    /**
     * @name InjectableMetadata#providerFtn
     * @type {WeakSet.<Function>}
     */
    this.providerFtn = new WeakSet();

    /**
     * @name InjectableMetadata#provider
     * @type {WeakMap.<Provider, Function>}
     */
    this.provider = new WeakMap();
  }

  /**
   * Tests whether metadata has been assigned to object
   * @param {Object|Function} object
   * @returns {boolean}
   */
  hasMetadataAssigned(object) {
    return !!this.metaMap.get(object);
  }

  /**
   * Finds or creates weakly-reachable metadata for object.
   * @param {Object|Function} object
   * @returns {InjectableMetadata.Collection}
   */
  findOrAddMetadataFor(object) {
    let meta = this.metaMap.get(object);
    if (!meta) {
      meta = {};

      this.metaMap.set(object, meta);
    }

    return meta;
  }

  /**
   * @param {Provider} provider
   * @param {Function} factoryFunction
   */
  setProvider(provider, factoryFunction) {
    this.providerFtn.add(factoryFunction);
    this.provider.set(provider, factoryFunction);
  }

  /**
   * @param {Provider} provider
   * @returns {?Function}
   */
  getProviderFunction(provider) {
    return this.provider.get(provider);
  }

  /**
   * @param {Function} providerFtn
   * @returns {boolean}
   */
  isProviderFunctionAlreadyRegistered(providerFtn) {
    return this.providerFtn.has(providerFtn);
  }

  /**
   * Used only for testing, do not call.
   */
  resetAll() {
    this.metaMap = new WeakMap();
    this.providerFtn = new WeakSet();
    this.provider = new WeakMap();
  }
}

module.exports = new InjectableMetadata();

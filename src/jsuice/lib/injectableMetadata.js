/* eslint-disable no-unused-vars */

const InjectorUtils = require('./InjectorUtils');
const Provider = require('./Provider');
const InjectedParamType = require('./InjectedParamType');

/**
 * @typedef {{moduleFilePath: String, scope: Scope, eager: Boolean, flags: Number, injectedParams: Array.<String|Instancer>, injectedParamTypes: Array.<InjectedParamType>, numberOfUserSuppliedArgs: Number=}} InjectableMetadata.Collection
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
     * @type {WeakSet.<ProviderFunction<T>>}
     * @template T
     */
    this.providerFtn = new WeakSet();

    /**
     * @name InjectableMetadata#provider
     * @type {WeakMap.<Provider, ProviderFunction<T>>}
     * @template T
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
   * @param {ProviderFunction<T>} providerFunction
   * @template T
   */
  setProvider(provider, providerFunction) {
    this.providerFtn.add(providerFunction);
    this.provider.set(provider, providerFunction);
  }

  /**
   * @param {Provider} provider
   * @returns {?ProviderFunction<T>}
   */
  getProviderFunction(provider) {
    return this.provider.get(provider);
  }

  /**
   * @param {ProviderFunction<T>} providerFtn
   * @returns {boolean}
   * @template T
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

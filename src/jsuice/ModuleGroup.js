const isString = require("lodash.isstring");
const Injectable = require("./Injectable");

/**
 * This class is for internal use only.  Use {@link Injector#moduleGroup} to create a new ModuleGroup.
 * @class
 * @package
 */
class ModuleGroup {
  /**
   * @param {String} name module group name
   * @param {DependencyGraph} dependencyGraph dependency graph from the parent injector
   * @param {InjectableMetadata} injectableMetadata injectable metadata
   */
  constructor(name, dependencyGraph, injectableMetadata) {
    /**
     * @name ModuleGroup#name
     * @type {string}
     * @package
     */
    this.name = name;

    /**
     * @name ModuleGroup#injectables
     * @type {Object.<string, *>}
     * @package
     */
    this.injectables = {};

    /**
     * @name ModuleGroup#dependencyGraph
     * @type {DependencyGraph}
     * @package
     */
    this.dependencyGraph = dependencyGraph;

    /**
     * @name ModuleGroup#injectableMetadata
     * @type {InjectableMetadata}
     * @package
     */
    this.injectableMetadata = injectableMetadata;
  }

  /**
   * @param {String} injectableName
   * @param {(Function|Object)} subject
   * @returns {Injectable}
   */
  register(injectableName, subject) {
    if (!isString(injectableName)) {
      throw new Error("Expected first parameter to be a string");
    }
    if (Object.prototype.hasOwnProperty.call(this.injectables, injectableName)) {
      throw new Error(`${injectableName} already registered in module group ${this.name}`);
    }

    const injectable = new Injectable(subject, injectableName);
    this.injectables[injectableName] = injectable;

    this.dependencyGraph.associateInjectableWithModuleGroup(injectable, this.name);
    if (this.injectableMetadata.hasMetadataAssigned(subject)) {
      const metadata = this.injectableMetadata.findOrAddMetadataFor(subject);
      (metadata.injectedParams || []).forEach((paramName) => {
        this.dependencyGraph.associateConstructionParameterWithInjectable(paramName, injectable);
      });
    }

    return injectable;
  }

  /**
   * @param {string} name
   * @returns {Injectable|null}
   */
  getInjectable(name) {
    return this.injectables[name] || null;
  }
}

module.exports = ModuleGroup;

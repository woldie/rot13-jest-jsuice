const isString = require("lodash.isstring");
const Injectable = require("./Injectable");

const log = require('../logger')('commons/ModuleGroup');

/**
 * This class is for internal use only.  Use {@link Injector#newModuleGroup} to create a new ModuleGroup.
 * @class
 * @package
 */
class ModuleGroup {
  /**
   * @param {String} name module group name
   */
  constructor(name) {
    /**
     * @name ModuleGroup#name
     * @type {string}
     */
    this.name = name;

    /**
     * @name ModuleGroup#injectables
     * @type {Object.<string, *>}
     */
    this.injectables = {};
  }

  /**
   * @param {String} injectableName
   * @param {(Function|Object)} subject
   * @returns {Injectable}
   */
  register(injectableName, subject) {
    if (!isString(injectableName)) {
      log.error("Expected first parameter to be a string");
      throw new Error("Expected first parameter to be a string");
    }
    if (Object.prototype.hasOwnProperty.call(this.injectables, injectableName)) {
      log.error(`${injectableName} already registered in module group ${this.name}`);
      throw new Error(`${injectableName} already registered in module group ${this.name}`);
    }

    const injectable = new Injectable(subject, injectableName);
    this.injectables[injectableName] = injectable;

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

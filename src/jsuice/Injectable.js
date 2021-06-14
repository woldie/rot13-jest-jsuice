/* eslint-disable no-eval,new-cap,dot-notation,no-unused-vars */
const union = require("lodash.union");
const InjectableType = require("./InjectableType");
const Scope = require("./Scope");
const ModuleFactory = require("./Provider");

const log = require('../logger')("commons/Injectable");

class Injectable {

  constructor(subject, injectableName) {
    const self = this;
    let type;
    let scope;
    let metaObj;
    let describedParameters;
    let eagerInstantiation = false;

    /**
     * @name Injectable#injectedParams
     * @type {Array.<string>}
     */
    self.injectedParams = [];

    const typeofSubject = typeof subject;
    switch (typeofSubject) {
      case "function":
        scope = Scope.PROTOTYPE;
        type = InjectableType.INJECTED_CONSTRUCTOR;

        if (!Object.prototype.hasOwnProperty.call(subject, "$meta")) {
          if (subject.length) {
            throw new Error(`Injectable '${injectableName}' constructor function requires a $meta ` +
                `property to describe its constructor args`);
          }
        } else {
          metaObj = subject["$meta"];
          describedParameters = metaObj.injectedParams || [];

          if (Object.prototype.hasOwnProperty.call(metaObj, "type")) {
            throw new Error(`Injectable may not specify its own type in $meta: ${injectableName}`);
          }

          if ((describedParameters.length + metaObj.numberOfUserSuppliedArgs) !== subject.length) {
            throw new Error(`Injectable '${injectableName}' constructor function argument count ` +
                `(${subject.length}) differs from the count of $meta.injectedParams ` +
                `(${describedParameters.length}) plus number of expected user-supplied arguments ` +
                `(${metaObj.numberOfUserSuppliedArgs})`);
          }

          Array.prototype.push.apply(self.injectedParams, describedParameters);

          if (Object.prototype.hasOwnProperty.call(metaObj, "scope")) {
            scope = metaObj.scope;
          }

          eagerInstantiation = !!metaObj.eager;
        }
        break;

      case "object":
        if (subject instanceof String) {
          Injectable.failWithTypeofError(injectableName, "String");
        }

        if (subject instanceof ModuleFactory) {
          type = InjectableType.MODULE_FACTORY;
          scope = Scope.PROTOTYPE;
          Array.prototype.push.apply(self.injectedParams, subject.dependencies);
        } else if (subject instanceof String) {
          Injectable.failWithTypeofError(injectableName, "String");
        } else {
          type = InjectableType.OBJECT_INSTANCE;
          scope = Scope.SINGLETON;
        }
        break;

      default:
        Injectable.failWithTypeofError(injectableName, typeofSubject);
    }

    /**
     * @type {InjectableType}
     */
    self.type = type;

    /**
     * @type {Object|Function}
     */
    self.subject = subject;

    /**
     * @type {Scope}
     */
    self.scope = scope;

    /**
     * @package
     * @type {(null|function(Function, Array.<*>): Object)}
     */
    self.newInstanceFunction = null;

    /**
     * @package
     * @type {String}
     */
    self.name = injectableName;

    /**
     * @package
     * @type {boolean}
     */
    self.eagerInstantiation = eagerInstantiation;
  }

  static failWithTypeofError(injectableName, typeofSubject) {
    throw new Error(`For module ${injectableName}, subject was expected to be either an object or a ` +
        `function, but was a ${typeofSubject}`);
  }

  /**
   * @package
   * @param {Number} numParams number of parameters that are expected on the constructor
   * @returns {function(Function, Array.<*>): Object} dynamic object factory function
   */
  createDynamicObjectFactory(numParams) {
    switch (numParams) {
      case 0:
        return (ctor, p) => new ctor();
      case 1:
        return (ctor, p) => new ctor(p[0]);
      case 2:
        return (ctor, p) => new ctor(p[0], p[1]);
      case 3:
        return (ctor, p) => new ctor(p[0], p[1], p[2]);
      default:
        // fallthrough
    }

    const paramStrings = [];

    for (let i = 0; i < numParams; i += 1) {
      paramStrings.push(`p[${i}]`);
    }

    // noinspection JSValidateTypes
    return eval(
        `(function(ctor, p) { return new ctor(${paramStrings.join(",")}); });`
    );
  }

  /**
   * Always returns a new instance, regardless of scope value.  should only be called by Injector and not
   * directly.  Behavior undefined for types other than INJECTED_CONSTRUCTOR or MODULE_FACTORY.
   *
   * @package
   * @param {Array} params
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters used by MODULE_FACTORY-type
   * and INJECTED_CONSTRUCTOR-type injectables only, otherwise ignored.
   * @returns {Object}
   */
  newInstance(params, assistedInjectionParams) {
    const self = this;
    const combinedParams = union(params, assistedInjectionParams);

    if (self.type === InjectableType.MODULE_FACTORY) {
      if (assistedInjectionParams.length !== self.subject.numberOfUserSuppliedArgs) {
        throw new Error(`Invalid number of user-supplied parameters for assisted injection, expected ` +
            `${self.subject.numberOfUserSuppliedArgs}, got ${assistedInjectionParams.length}`);
      }

      // module factories don't need to synthesize a newInstanceFunction and cache that because they have
      // a factory function built in that we can call directly using apply
      return self.subject["__createInstance"](...combinedParams);
    }

    if (self.type === InjectableType.INJECTED_CONSTRUCTOR) {
      const metaObj = self.subject["$meta"] || {numberOfUserSuppliedArgs: 0};

      if (assistedInjectionParams.length !== metaObj.numberOfUserSuppliedArgs) {
        throw new Error(`Invalid number of user-supplied parameters for assisted injection, expected ` +
            `${metaObj.numberOfUserSuppliedArgs}, got ${assistedInjectionParams.length}`);
      }

      if (!self.newInstanceFunction) {
        self.newInstanceFunction = self.createDynamicObjectFactory(combinedParams.length);
      }

      return self.newInstanceFunction(self.subject, combinedParams);
    }

    throw new Error("BUG: should never get here");
  }
}

module.exports = Injectable;

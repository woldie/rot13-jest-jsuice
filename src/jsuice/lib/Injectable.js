/* eslint-disable no-eval,new-cap,dot-notation,no-unused-vars,no-underscore-dangle */
const union = require("lodash.union");
const InjectableType = require("./InjectableType");
const Scope = require("./Scope");
const Provider = require("./Provider");
const injectableMetadata = require("./injectableMetadata");

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
     * @type {Array.<String>}
     */
    self.injectedParams = [];

    /**
     * @name Injectable#injectedParamTypes
     * @type {Array.<InjectedParamType>}
     */
    self.injectedParamTypes = [];

    const typeofSubject = typeof subject;
    switch (typeofSubject) {
      case 'function':
        scope = Scope.PROTOTYPE;
        type = InjectableType.INJECTED_CONSTRUCTOR;

        if (!injectableMetadata.hasMetadataAssigned(subject)) {
          if (subject.length) {
            throw new Error(`Injectable constructor function '${
              injectableName}' requires metadata annotations property to describe its constructor args`);
          }
        } else {
          metaObj = injectableMetadata.findOrAddMetadataFor(subject);
          describedParameters = metaObj.injectedParams || [];

          if (Object.prototype.hasOwnProperty.call(metaObj, 'type')) {
            throw new Error(`Injectable may not specify its own type in its metadata: ${injectableName}`);
          }

          if ((describedParameters.length + metaObj.numberOfUserSuppliedArgs) !== subject.length) {
            throw new Error(`Injectable '${injectableName}' constructor function argument count (${
              subject.length}) differs from the expected count of injectedParams in type metadata (${
              describedParameters.length}) plus number of expected user-supplied arguments (${
              metaObj.numberOfUserSuppliedArgs})`);
          }

          Array.prototype.push.apply(self.injectedParams, describedParameters);
          Array.prototype.push.apply(self.injectedParamTypes, metaObj.injectedParamTypes);

          if (Object.prototype.hasOwnProperty.call(metaObj, "scope")) {
            scope = metaObj.scope;
          }

          eagerInstantiation = !!metaObj.eager;
        }
        break;

      case 'object':
        if (subject instanceof Provider) {
          type = InjectableType.PROVIDER;
          scope = Scope.PROTOTYPE;
          Array.prototype.push.apply(self.injectedParams, subject.dependencies);
          Array.prototype.push.apply(self.injectedParamTypes, subject.injectedParamTypes);
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
     * @type {?function(Function, Array.<*>): Object}
     */
    self.newInstanceFunction = null;

    /**
     * @package
     * @type {string}
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
   * directly.  Behavior undefined for types other than INJECTED_CONSTRUCTOR or PROVIDER.
   *
   * @package
   * @param {Array} params
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters used by PROVIDER-type
   * and INJECTED_CONSTRUCTOR-type injectables only, otherwise ignored.
   * @returns {Object}
   */
  newInstance(params, assistedInjectionParams) {
    const self = this;
    const combinedParams = union(params, assistedInjectionParams);

    if (self.type === InjectableType.PROVIDER) {
      const provider = /** @type {Provider} */ self.subject;
      if (assistedInjectionParams.length !== provider.numberOfUserSuppliedArgs) {
        throw new Error(`Invalid number of user-supplied parameters for assisted injection, expected ` +
            `${provider.numberOfUserSuppliedArgs}, got ${assistedInjectionParams.length}`);
      }

      // Providers don't need to synthesize a newInstanceFunction and cache that because they have
      // a factory function associated with them that we can call directly using apply

      const providerFtn = injectableMetadata.getProviderFunction(provider)
      if (!providerFtn) {
        throw new Error(`BUG: no provider function was found for provider`);
      }

      return providerFtn.apply(provider, combinedParams);
    }

    if (self.type === InjectableType.INJECTED_CONSTRUCTOR) {
      const metaObj = injectableMetadata.hasMetadataAssigned(self.subject) ?
        injectableMetadata.findOrAddMetadataFor(self.subject) :
        { numberOfUserSuppliedArgs: 0};

      if (assistedInjectionParams.length !== metaObj.numberOfUserSuppliedArgs) {
        throw new Error(`Invalid number of user-supplied parameters for assisted injection for ${self.name}, expected ${
          metaObj.numberOfUserSuppliedArgs}, got ${assistedInjectionParams.length}`);
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

/* eslint-disable prefer-rest-params,no-bitwise,max-classes-per-file */
// noinspection JSCommentMatchesSignature

const isString = require("lodash.isstring");
const isFunction = require("lodash.isfunction");
const isNumber = require("lodash.isnumber");
const map = require("lodash.map");
const Scope = require("./Scope");
const InjectableType = require("./InjectableType");
const ModuleGroup = require("./ModuleGroup");
const Provider = require("./Provider");
const injectableMetadata = require("./injectableMetadata");
const InjectorUtils = require('./InjectorUtils');

/**
 * For internal use only.  injector.js exports a global singleton that should be invoked directly.
 * @package
 * @constructor
 */
class Injector {
  constructor() {
    const self = this;

    /**
     * @name Injector#id
     * @type {number}
     */
    self.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    /**
     * @name Injector#scopes
     * @type {Object.<Scope, Object<string, *>>}
     */
    self.scopes = {};
    self.scopes[Scope.SINGLETON] = {};
    self.scopes[Scope.APPLICATION] = {};

    /**
     * @name Injector#moduleGroups
     * @type {Array.<ModuleGroup>}
     */
    self.moduleGroups = [];

    /**
     * @package
     * @name Injector#nameStack
     * @type {Array.<String>}
     */
    self.nameStack = [];

    /**
     * @package
     * @name Injector#scopeStack
     * @type {Array.<Scope>}
     */
    self.scopeStack = [];
  }

  /**
   * Make a new module group and add it to the Injector.
   *
   * @param {String} name name of the module group being registered
   * @param {...(String|*)} moduleDeclarations variable arguments containing alternating values of type String and *
   * where the string is the name of an Injectable Module.  The subject of the Injectable Module of type * can be one of
   * the following types:
   * <ul>
   *   <li>function: always assumed to be a class constructor function.  This function must be annotated via the
   *       {@link #annotateConstructor} method.  The <code>new</code> keyword is used on the constructor to instantiate
   *       objects as needed.</li>
   *   <li>object: If it is a plain javascript object, then subject is assumed to be SINGLETON-scoped and will be
   *       injected as-is (not as a proxy or clone) to dependents.  If it is an <code>instanceof</code>
   *       {@link Provider} created by {@link #createProvider}, then the subject will be constructed by calling the
   *       provider function, and the object returned will be assumed to be PROTOTYPE-scope at time of injection to
   *       dependents.</li>
   * </ul>
   * @throws {Error} It is considered to be an error if moduleDeclarations is zero length, odd-lengthed, if any of the
   * Injectable Module names are not String types, or if the module group name has been used before, or if module name
   * has been used before in other module groups.
   * @return {Injector}
   */
  newModuleGroup(name) {
    // get the variable args starting at moduleDeclarations and reassign to that symbol as an array
    const moduleDeclarations = Array.from(arguments).slice(1);

    if (!moduleDeclarations || !moduleDeclarations.length) {
      throw new Error("no moduleDeclarations found");
    }

    if ((moduleDeclarations.length & 1)) {
      throw new Error("moduleDeclarations length must be evenly divisible by 2");
    }

    const self = this;
    const eagerSingletons = [];
    let moduleName;
    let otherGroup;

    let moduleGroup = self.findModuleGroup(name);

    if (moduleGroup) {
      throw new Error(`ModuleGroup ${name} already exists!`);
    }

    // add the module prior to registering
    moduleGroup = self.addModuleGroup(name);

    for (let i = 0, ii = moduleDeclarations.length; i < ii; i += 2) {
      moduleName = moduleDeclarations[i];
      if (!isString(moduleName)) {
        throw new Error(`string expected at moduleDeclarations[${i}]`);
      }

      for (let j = 0, jj = self.moduleGroups.length; j < jj; j += 1) {
        otherGroup = self.moduleGroups[j];

        if (otherGroup.getInjectable(moduleName)) {
          if (otherGroup === moduleGroup) {
            throw new Error(`Module ${moduleName} was registered more than once in ${
              moduleGroup.name} module group`);
          } else {
            throw new Error(`Module ${moduleName} in module group ${
              moduleGroup.name} was already registered in another module group ${otherGroup.name}`);
          }
        }
      }

      const injectable = moduleGroup.register(moduleName, moduleDeclarations[i + 1]);

      if (injectable.scope === Scope.SINGLETON && injectable.eagerInstantiation) {
        eagerSingletons.push(moduleName);
      }
    }

    // instantiate any eager singletons NOW by calling getInstance on the module names
    for (let i = 0, ii = eagerSingletons.length; i < ii; i += 1) {
      self.getInstance(eagerSingletons[i]);
    }

    return self;
  }

  /**
   * Annotate a constructor function with metadata that instructs the injector what the scope, injectedParams and
   * other configuration flags should be when it instantiates using that constructor.  With the annotations, the
   * constructor is converted into a jsuice module that can be added to a module group using
   * {@link Injector#newModuleGroup}.
   *
   * @param {typeof T} ctor constructor function.  injectedParams.length + numberOfUserSuppliedArgs must exactly equal the
   * number of named parameters on the ctor function
   * @param {...(number|string)} args metadata about ctor.  The format of args is
   * <blockquote><pre>[ flags, [ numberOfUserSuppliedArgs, ] ] [ injectedParams... ]</pre></blockquote>
   * where:
   * <ul>
   *   <li><code>Number flags</code> - integer containing flags (as set bits) that describe what the scope and
   *   configuration flags should be for the constructor.  See {@link Injector#APPLICATION_SCOPE},
   *   {@link Injector#SINGLETON_SCOPE}, {@link Injector#PROTOTYPE_SCOPE} and {@link Injector#EAGER_FLAG}</li>
   *   <li><code>Number numberOfUserSuppliedArgs</code> - positive integer describing how many extra parameters will the
   *   user pass to the constructor in addition to the ones supplied by the injector.  numberOfUserSuppliedArgs defaults
   *   to 0 if not specified.  It is an error for numberOfUserSuppliedArgs to be > 0 for scope flags other than
   *   SCOPE_PROTOTYPE.</li>
   *   <li><code>String... injectedParams</code> - names of modules that need to be instantiated and passed as parameters
   *   to the ctor at time of instantiation.</li>
   * </ul>
   * @returns {typeof T} annotated constructor function
   * @template T
   * @see {@link Injector#newModuleGroup}
   */
  annotateConstructor(ctor) {
    if (!isFunction(ctor)) {
      throw new Error("annotateConstructor: ctor is a required parameter and must be a constructor function");
    }
    if (!ctor.prototype) {
      throw new Error("annotateConstructor: ctor.prototype is null");
    }
    if (ctor.prototype.constructor !== ctor) {
      throw new Error("annotateConstructor: ctor's prototype requires a 'constructor' property that equates to ctor");
    }

    const argList = Array.from(arguments);
    const isFlagsSupplied = isNumber(argList[1]);
    const isUserSuppliedArgsCountSpecified = isNumber(argList[2]);
    const injectedParamsStartIndex = 1 + (isFlagsSupplied ? 1 : 0) + (isUserSuppliedArgsCountSpecified ? 1 : 0);
    const metaObj = {
      injectedParams: (argList.length > injectedParamsStartIndex) ? argList.slice(injectedParamsStartIndex) : [],
      numberOfUserSuppliedArgs: (isUserSuppliedArgsCountSpecified ? argList[2] : 0),
      eager: false
    };

    for (let i = 0, ii = metaObj.injectedParams.length; i < ii; i += 1) {
      if (!isString(metaObj.injectedParams[i])) {
        throw new Error(`annotateConstructor: injectedParam[${
          i}] was not a string. Only strings may be passed for injectedParams. ctor: ${
          InjectorUtils.getFunctionSignature(ctor)}`);
      }
    }

    if ((metaObj.injectedParams.length + metaObj.numberOfUserSuppliedArgs) !== ctor.length) {
      throw new Error(`annotateConstructor: parameter counts do not match. Expected ctor to have ${
          metaObj.injectedParams.length} injectables + ${
          metaObj.numberOfUserSuppliedArgs} extra parameters, but ctor only has ${
          ctor.length} params. ctor: ${InjectorUtils.getFunctionSignature(ctor)}`);
    }

    let flags = isFlagsSupplied ? argList[1] : Injector.prototype.PROTOTYPE_SCOPE;

    switch (flags & (Injector.prototype.SINGLETON_SCOPE | Injector.prototype.APPLICATION_SCOPE |
        Injector.prototype.PROTOTYPE_SCOPE)) {
      case Injector.prototype.PROTOTYPE_SCOPE:
        metaObj.scope = Scope.PROTOTYPE;

        flags -= Injector.prototype.PROTOTYPE_SCOPE;

        break;

      case Injector.prototype.SINGLETON_SCOPE:
        if (isUserSuppliedArgsCountSpecified && metaObj.numberOfUserSuppliedArgs) {
          throw new Error("Assisted injection is not supported with application scope");
        }

        metaObj.scope = Scope.SINGLETON;

        flags -= Injector.prototype.SINGLETON_SCOPE;

        if ((flags & Injector.prototype.EAGER_FLAG) === Injector.prototype.EAGER_FLAG) {
          flags -= Injector.prototype.EAGER_FLAG;

          metaObj.eager = true;
        }
        break;

      case Injector.prototype.APPLICATION_SCOPE:
        if (isUserSuppliedArgsCountSpecified && metaObj.numberOfUserSuppliedArgs) {
          throw new Error("Assisted injection is not supported with application scope");
        }

        metaObj.scope = Scope.APPLICATION;

        flags -= Injector.prototype.APPLICATION_SCOPE;

        if ((flags & Injector.prototype.EAGER_FLAG) === Injector.prototype.EAGER_FLAG) {
          flags -= Injector.prototype.EAGER_FLAG;

          metaObj.eager = true;
        }
        break;

      default:
        throw new Error("Exactly one scope flag was expected");
    }

    if ((flags & Injector.prototype.EAGER_FLAG)) {
      throw new Error("Eager flag is only permitted on the SINGLETON and APPLICATION scopes");
    }

    if (flags) {
      throw new Error("Unknown flags");
    }

    // copy metaObj properties into the metadata object for the ctor
    Object.assign(injectableMetadata.findOrAddMetadataFor(ctor), metaObj);

    return ctor;
  }

  /**
   * Create a Provider that wraps a function for acquiring an object instance.  The Provider is suitable for passing to
   * {@link Injector#newModuleGroup} as an injectable subject.
   *
   * <p>Use Providers whenever items you want to be injectables cannot be represented with a class or there are
   * complicating factors to acquiring the injectable.  For example, an asynchronously initialized item would be wrapped
   * with a Promise.  In that case, providerFunction would return a Promise to the item and the user
   * would wait on the Promise to get access to the item.
   *
   * @param {function} providerFunction a function that takes injectedParams plus optional user-supplied arguments and
   * returns an object.  injectedParams.length + numOfUserSuppliedArgs must exactly equal the number of named
   * parameters on the providerFunction.
   * @param {Number} numOfUserSuppliedArgs number of parameters that are expected to be passed from calls to
   * {@link Injector#getInstance} to the factory function when the returned Provider is the injectable subject.
   * Whenever the Injector calls the providerFunction, instances for the injectedParams will always be passed in the
   * argument list to the providerFunction first, followed by the user-supplied args that were passed to
   * {@link Injector#getInstance}.
   * @param {...String=} injectedParams names of modules that need to be instantiated and passed as parameters to the
   * providerFunction at time of instantiation
   * @returns {Provider} a Provider that can be passed to Injector#newModuleGroup as an injectable subject
   */
  createProvider(providerFunction, numOfUserSuppliedArgs) {
    const dependenciesList = (arguments.length > 2) ? Array.from(arguments).slice(2) : ([]);

    class ProviderImpl extends Provider {
      constructor() {
        super(dependenciesList, numOfUserSuppliedArgs);
      }
    }

    const provider = new ProviderImpl();

    if (injectableMetadata.isProviderFunctionAlreadyRegistered(providerFunction)) {
      throw new Error(`Factory function already registered as a Provider: ${
        InjectorUtils.getFunctionSignature(providerFunction)}`)
    }

    injectableMetadata.setProvider(provider, providerFunction);

    return provider;
  }

  /**
   * Get an instance of named injectable.  If an existing, in-scope object can be found in cache, that instance will be
   * returned rather than a new instance.
   *
   * @param {String} name instance name
   * @param {...*=} assistedInjectionParams additional parameters that will get passed to a provider function.  It is an
   * error to pass assistedInjectionParams if named module is not constructed with a provider.  (See
   * {@link Injector#createProvider} for more information.)
   * @returns {*}
   */
  getInstance(name) {
    const assistedInjectionParams = (arguments.length > 1) ? Array.from(arguments).slice(1) : [];

    return this.getInstanceRecursion(name, this.nameStack, this.scopeStack, assistedInjectionParams);
  }

  /**
   * @typedef {{moduleName: String, instance: *}} ModuleInstance
   */

  /**
   * <p>Get all instances of named Injectables hosted for a module group.
   *
   * @param {String} moduleGroupName
   * @returns {Array.<ModuleInstance>} list of objects containing a single pair of injectable name -> instance of
   * named injectable
   */
  getModuleGroupInstances(moduleGroupName) {
    if (arguments.length > 1) {
      throw new Error("getModuleGroupInstances does not currently support assisted injection to its injectables");
    }

    const self = this;
        const moduleGroup = self.findModuleGroup(moduleGroupName);

    if (!moduleGroup) {
      throw new Error(`getModuleGroupInstances: ModuleGroup ${moduleGroupName} not found`);
    }

    return map(moduleGroup.injectables, (injectable) => ({
      moduleName: injectable.name,
      instance: self.getInstanceForInjectable(injectable, self.nameStack, self.scopeStack, [])
    }));
  }

  /**
   * Recursive internals for getInstance.
   *
   * @private
   * @param {String} name
   * @param {Array.<String>} nameHistory stack of injectable names that are used to prevent circular dependencies
   * @param {Array.<Scope>} scopeHistory stack of scopes that match up with names
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters that will be passed to
   * top-level module factory injectables during recursion, otherwise empty array.
   * @returns {Object}
   */
  getInstanceRecursion(name, nameHistory, scopeHistory, assistedInjectionParams) {
    if (nameHistory.indexOf(name) !== -1) {
      const root = nameHistory[0];
      throw new Error(`Circular dependency in dependency graph for '${root}', name history stack: ${nameHistory}`);
    }

    const self = this;

    for (let i = 0, ii = self.moduleGroups.length; i < ii; i += 1) {
      const injectable = self.moduleGroups[i].getInjectable(name);

      if (injectable) {
        if (scopeHistory.length && scopeHistory[scopeHistory.length - 1] < injectable.scope) {
          const previousName = nameHistory[nameHistory.length - 1];
          throw new Error(`Cannot inject ${name} into ${previousName}, ${name} has a wider scope.`);
        }

        return self.getInstanceForInjectable(injectable, nameHistory, scopeHistory, assistedInjectionParams);
      }
    }

    const additionalInfo = self.moduleGroups.length
        ? (`module groups currently registered: ${  map(self.moduleGroups, (moduleGroup) => moduleGroup.name)}`)
        : (`${"no module groups were found.  Are you calling a different Injector instance than the one you expected?" +
            "  Current injector.id = "}${  self.id}`);

    throw new Error(`Did not find any injectable for: ${name}; ${additionalInfo}`);
  }

  /**
   * Fail if there are assistedInjectionParams passed to scopes/types that cannot support them
   */
  static assertAssistedInjectionParamsIsEmpty(scope, type, assistedInjectionParams) {
    if (assistedInjectionParams.length) {
      if (!(scope === Scope.PROTOTYPE &&
          (type === InjectableType.PROVIDER || type === InjectableType.INJECTED_CONSTRUCTOR))) {
        throw new Error("Assisted injection parameters were passed but are not allowed for this injectable");
      }
    }
  }

  /**
   * Gets or instantiates an object for an Injectable.
   *
   * @package
   * @param {Injectable} injectable
   * @param {Array.<String>} nameHistory stack of injectable names that are used to prevent circular dependencies
   * @param {Array.<Scope>} scopeHistory stack of scopes that match up with names
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters that will be passed to
   * top-level module factory injectables during recursion, otherwise empty array.
   * @returns {*}
   */
  getInstanceForInjectable(injectable, nameHistory, scopeHistory, assistedInjectionParams) {
    const self = this;
        let instance; let singletonScope;

    Injector.assertAssistedInjectionParamsIsEmpty(injectable.scope, injectable.type, assistedInjectionParams);

    nameHistory.push(injectable.name);
    scopeHistory.push(injectable.scope);

    try {
      switch (injectable.scope) {
        case Scope.PROTOTYPE:
          switch (injectable.type) {
            case InjectableType.INJECTED_CONSTRUCTOR:
            case InjectableType.PROVIDER:
              return self.newInjectableInstance(injectable, nameHistory, scopeHistory, assistedInjectionParams);

            case InjectableType.OBJECT_INSTANCE:
              // Would this be cloned in order to be instantiated then?  Opting to not support this until needed.
              throw new Error("Not yet implemented");

            default:
              throw new Error(`Unknown Injectable type: ${injectable.type}`);
          }
        case Scope.SINGLETON:
          singletonScope = self.scopes[Scope.SINGLETON];

          if (Object.prototype.hasOwnProperty.call(singletonScope, injectable.name)) {
            return singletonScope[injectable.name];
          }

          switch (injectable.type) {
            case InjectableType.INJECTED_CONSTRUCTOR:
              instance = self.newInjectableInstance(injectable, nameHistory, scopeHistory, []);
              break;

            case InjectableType.OBJECT_INSTANCE:
              instance = injectable.subject;
              break;

            case InjectableType.PROVIDER:
              throw new Error("Not implemented");

            default:
              throw new Error(`Unknown Injectable type: ${injectable.type}`);
          }

          singletonScope[injectable.name] = instance;

          return instance;

        case Scope.APPLICATION:
          throw new Error("Not implemented");
        default:
          throw new Error(`Unknown Injectable scope: ${injectable.scope}`);
      }
    } finally {
      scopeHistory.pop();
      nameHistory.pop();
    }
  }

  /**
   * find existing ModuleGroup by name.
   */
  findModuleGroup(name) {
    const self = this;

    for (let i = 0, ii = self.moduleGroups.length; i < ii; i += 1) {
      const otherModuleGroup = self.moduleGroups[i];
      if (otherModuleGroup.name === name) {
        return otherModuleGroup;
      }
    }

    return null;
  }

  /**
   * Adds a module group to Injector, if one already exists with that name don't create a new one, just return the
   * old one.
   *
   * @package
   * @param {String} name
   * @return {ModuleGroup}
   */
  addModuleGroup(name) {
    const self = this;

    const existingModuleGroup = self.findModuleGroup(name);
    if (existingModuleGroup) {
      return existingModuleGroup;
    }

    const moduleGroup = new ModuleGroup(name);
    self.moduleGroups.push(moduleGroup);

    return moduleGroup;
  }

  /**
   * Used in testing to reset Injector internals.  Do not call.
   *
   * @package
   * @param {Scope} scope
   */
  clearScope(scope) {
    Object.keys(Scope).forEach(scopeName => {
      if (Scope[scopeName] === scope) {
        this.scopes[scope] = {};
      }
    });
  }

  /**
   * We know we need to instantiate injectable, now fan-out the recursion to fetch/instantiate all of the
   * injected dependencies intended for the injectable.
   *
   * @package
   * @param {Injectable} injectable
   * @param {Array.<String>} nameHistory
   * @param {Array.<Scope>} scopeHistory
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters that will be passed to
   * top-level module factory injectables during recursion, otherwise empty array.
   * @returns {Object}
   */
  newInjectableInstance(injectable, nameHistory, scopeHistory, assistedInjectionParams) {
    const params = [];

    for (let j = 0, jj = injectable.injectedParams.length; j < jj; j += 1) {
      // assistedInjectionParams is never passed along to dependencies, always passing empty set from this point on
      params.push(this.getInstanceRecursion(injectable.injectedParams[j], nameHistory, scopeHistory, []));
    }

    return injectable.newInstance(params, assistedInjectionParams);
  }
}

/**
 * @name Injector#SINGLETON_SCOPE
 * @type {number}
 * @const
 */
Injector.prototype.SINGLETON_SCOPE = 1;

/**
 * @name Injector#APPLICATION_SCOPE
 * @type {number}
 * @const
 */
Injector.prototype.APPLICATION_SCOPE = 2;

/**
 * @name Injector#PROTOTYPE_SCOPE
 * @type {number}
 * @const
 */
Injector.prototype.PROTOTYPE_SCOPE = 4;

/**
 * @name Injector#EAGER_FLAG
 * @type {number}
 * @const
 */
Injector.prototype.EAGER_FLAG = 128;

// global singleton
module.exports = new Injector();

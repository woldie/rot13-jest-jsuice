/* eslint-disable prefer-rest-params,no-bitwise,max-classes-per-file,no-param-reassign */
// noinspection JSCommentMatchesSignature,JSBitwiseOperatorUsage

const isString = require('lodash.isstring');
const isFunction = require('lodash.isfunction');
const isNumber = require('lodash.isnumber');
const isUndefined = require('lodash.isundefined');
const map = require('lodash.map');
const forEach = require('lodash.foreach');
const keys = require('lodash.keys');
const Scope = require('./Scope');
const Flags = require('./Flags');
const InjectableType = require('./InjectableType');
const ModuleGroup = require('./ModuleGroup');
const Provider = require('./Provider');
const injectableMetadata = require('./injectableMetadata');
const InjectorUtils = require('./InjectorUtils');
const DependencyGraph = require('./dependencies/DependencyGraph');
const InjectedParamType = require('./InjectedParamType');

/**
 * J'suice Dependency Injector
 */
class Injector {
  constructor() {
    const self = this;

    /**
     * @name Injector#id
     * @type {number}
     * @package
     * @ignore
     */
    self.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    /**
     * @name Injector#scopes
     * @type {Object.<Scope, Object<string, *>>}
     * @package
     * @ignore
     */
    self.scopes = {};
    self.scopes[Scope.SINGLETON] = {};
    self.scopes[Scope.APPLICATION] = {};

    /**
     * @name Injector#moduleGroups
     * @type {Array.<ModuleGroup>}
     * @package
     * @ignore
     */
    self.moduleGroups = [];

    /**
     * @name Injector#nameStack
     * @type {Array.<String>}
     * @package
     * @ignore
     */
    self.nameStack = [];

    /**
     * @name Injector#scopeStack
     * @type {Array.<Scope>}
     * @package
     * @ignore
     */
    self.scopeStack = [];

    /**
     * @name Injector#dependencyGraph
     * @type {DependencyGraph}
     * @package
     * @ignore
     */
    self.dependencyGraph = new DependencyGraph();

    /**
     * Keeps track of which functions we have created to be factory functions.  Prevents callers from passing the
     * Injector arbitrary functions that it will call.
     *
     * @name Injector#isFactoryFunction
     * @type {WeakMap<Function, String>}
     * @package
     * @ignore
     */
    self.isFactoryFunction = new WeakMap();
  }

  /**
   * Used to instantiate an injectable.  If Function, Subject is assumed to be a class constructor that can be used
   * with the <code>new</code> keyword.  If Object, Subject is assumed to be a pre-existing, singleton object that can
   * be returned as the injectable instance.  If Provider, Subject is assumed to be instantiatable by calling the
   * Provider's object factory function.
   *
   * @typedef {(Object|Provider|Function)} Subject
   */

  /**
   * Define a new module group by name and add it to the Injector.  Only after modules have been added to a module group
   * can they be instantiated by the Injector.
   *
   * <p>Module groups endow each of their modules with a unique name and creates a container called an Injectable that
   * the Injector uses to interact with the module.  All members of a module group can be instantiated at one time via
   * {@link Injector#getModuleGroupInstances}.
   *
   * @param {String} name name of the module group being registered.  name must be unique
   * @param {...(String|Subject)} moduleDeclarations variable arguments containing alternating values of type String
   * and {@link Subject}.  Each String is the name that the injectable module will be identified by in the Injector.
   * Each {@link Subject} is used by Injector to instantiate the named Injectable Module.  {@link Subject Subjects} can
   * be one of the following types:
   * <ul>
   *   <li>function: always assumed to be a class constructor function.  This function must be annotated via the
   *       {@link #annotateConstructor} method.  Injector uses the <code>new</code> keyword on the constructor to
   *       instantiate Injectable Modules when needed.</li>
   *   <li>object: If it is a plain javascript object, then subject is assumed to be SINGLETON-scoped and will be
   *       injected as-is (not as a proxy or clone) to dependents.</li>
   *   <li>{@link Provider}: If it is an <code>instanceof</code> {@link Provider} created by {@link #createProvider},
   *       then the subject will be constructed by calling the provider function, and the object returned will be
   *       assumed to be PROTOTYPE-scope at time of injection to dependents.</li>
   * </ul>
   * @throws {Error} It is an error if moduleDeclarations is zero length, odd-lengthed, if any of the Injectable Module
   * names are not String types, name has been used before, or if name has been used before in prior calls to {@link #moduleGroup}.
   * @return {Injector}
   */
  moduleGroup(name) {
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
   * @private
   * @ignore
   * @param {(String|FactoryFunction)} injectedParam
   * @param {Number} injectedParamIndex
   * @param {String} forFunction
   * @param {String} description
   * @returns {InjectedParamType} if valid injectedParam, this is its type
   * @throws {Error} if injectedParam is not a String or FactoryFunction
   */
  validateInjectedParam(injectedParam, injectedParamIndex, forFunction, description) {
    if (isString(injectedParam)) {
      return InjectedParamType.INJECTABLE_NAME;
    }
    if (isFunction(injectedParam) && this.isFactoryFunction.has(injectedParam)) {
      return InjectedParamType.FACTORY_FUNCTION;
    }

    throw new Error(`${forFunction} injectedParam[${
      injectedParamIndex}]: only Strings or FactoryFunctions may be passed for injectedParams. ${description}`);
  }

  /**
   * @template T
   * @typedef {typeof T} GenericConstructor
   */

  /**
   * @template T
   * @typedef {Function & GenericConstructor<T>} InjectableCtor
   */

  /**
   * Annotate a constructor function with metadata that instructs the injector what the scope, injectedParams and
   * other configuration flags should be when it instantiates using that constructor.  With the annotations, the
   * constructor is converted into a jsuice injectable that can then be added to a module group using
   * {@link #moduleGroup}.
   *
   * @param {InjectableCtor<T>} ctor constructor function to be used with the <code>new</code> keyword.
   * injectedParams.length + numberOfUserSuppliedArgs must exactly equal the number of named parameters on ctor
   * @param {Number=} flags optional integer containing flag constants that describe what the scope and configuration
   * flags should be for the constructor.  Valid flag constants are {@link #Scope.APPLICATION},
   * {@link #Scope.SINGLETON}, {@link #Scope.PROTOTYPE}, {@link #Flags.EAGER} and {@link #Flags.INFRASTRUCTURE}.  Use
   * bitwise-OR or the plus operator to union flag constants together into one flags value.
   * @param {Number=} numberOfUserSuppliedArgs optional positive integer describing how many extra parameters will the
   * user pass to the constructor in addition to the ones supplied by the injector.  numberOfUserSuppliedArgs defaults
   * to 0 if not specified.  It is an error for numberOfUserSuppliedArgs to be > 0 for scope flags other than
   * {@link Injector#Scope.PROTOTYPE}.  If numberOfUserSuppliedArgs is specified, then flags is required.
   * @param {...(String|FactoryFunction)} injectedParams 0-or-more ordered, variable argument set of String names of
   * injectables or {@link #FactoryFunction}s that must be instantiated by {@link #getInstance} that are passed as
   * constructor arguments to ctor.
   * @returns {typeof T} annotated constructor function
   * @template T
   * @see {@link Injector#moduleGroup}
   */
  annotateConstructor(ctor, flags, numberOfUserSuppliedArgs) {
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
    numberOfUserSuppliedArgs = isUserSuppliedArgsCountSpecified ? argList[2] : 0;
    const injectedParamsStartIndex = 1 + (isFlagsSupplied ? 1 : 0) + (isUserSuppliedArgsCountSpecified ? 1 : 0);
    const injectedParamsArray = (argList.length > injectedParamsStartIndex) ?
      argList.slice(injectedParamsStartIndex) :
      [];

    const metaObj = {
      injectedParams: injectedParamsArray,
      injectedParamTypes: map(injectedParamsArray, (injectedParam, idx) =>
        this.validateInjectedParam(injectedParam, idx, 'annotateConstructor', `ctor: ${
          InjectorUtils.getFunctionSignature(ctor)}`)),
      numberOfUserSuppliedArgs,
      eager: false,
      scope: Scope.PROTOTYPE,
      flags: 0
    };

    if ((metaObj.injectedParams.length + metaObj.numberOfUserSuppliedArgs) !== ctor.length) {
      throw new Error(`annotateConstructor: ctor named argument counts do not match. Expected ctor to take ${
          metaObj.injectedParams.length} injectable arguments + ${
          metaObj.numberOfUserSuppliedArgs} user-supplied arguments, but ctor has ${
          ctor.length} named arguments. ctor: ${InjectorUtils.getFunctionSignature(ctor)}`);
    }

    flags = isFlagsSupplied ? argList[1] : Scope.PROTOTYPE;

    switch (flags & (Scope.SINGLETON | Scope.APPLICATION | Scope.PROTOTYPE)) {
      case Scope.PROTOTYPE:
        metaObj.scope = Scope.PROTOTYPE;

        flags -= Scope.PROTOTYPE;

        break;

      case Scope.SINGLETON:
        if (isUserSuppliedArgsCountSpecified && metaObj.numberOfUserSuppliedArgs) {
          throw new Error("Assisted injection is not supported with application scope");
        }

        metaObj.scope = Scope.SINGLETON;

        flags -= Scope.SINGLETON;

        if ((flags & Flags.EAGER) === Flags.EAGER) {
          flags -= Flags.EAGER;

          metaObj.eager = true;
        }
        break;

      case Scope.APPLICATION:
        if (isUserSuppliedArgsCountSpecified && metaObj.numberOfUserSuppliedArgs) {
          throw new Error("Assisted injection is not supported with application scope");
        }

        metaObj.scope = Scope.APPLICATION;

        flags -= Scope.APPLICATION;

        if ((flags & Flags.EAGER) === Flags.EAGER) {
          flags -= Flags.EAGER;

          metaObj.eager = true;
        }
        break;

      default:
        throw new Error("Exactly one scope flag was expected");
    }

    if ((flags & Flags.EAGER)) {
      throw new Error("Eager flag is only permitted on the SINGLETON and APPLICATION scopes");
    }

    if (flags - Flags.INFRASTRUCTURE > 0) {
      throw new Error("Unknown flags");
    }

    metaObj.flags = flags;

    // copy metaObj properties into the metadata object for the ctor
    Object.assign(injectableMetadata.findOrAddMetadataFor(ctor), metaObj);

    return ctor;
  }

  /**
   * A factory function returned for a jsuice injectable from {@link #factoryFunction}.
   *
   * @typedef {Function} FactoryFunction
   * @param {...*} userSuppliedArguments 0-or-more required user-supplied variable argument list expected by the
   * injectable that this FactoryFunction instantiates.  See {@link #annotateConstructor} and {@link #createProvider}
   * for more discussion about user-supplied arguments.
   * @template T
   * @returns {T} Instance of injectable type T for the injectableName passed to {@link #factoryFunction}.  You may
   * pass this FactoryFunction as one of the injectedParams for {@link #annotateConstructor} and {@link #createProvider}
   */

  /**
   * Creates a factory function for injectableName can be passed to {@link #annotateConstructor} or
   * {@link #createProvider} to describe an injectable parameter.  A factory function is useful in assisted injection
   * scenarios where {@link #Scope.PROTOTYPE} objects need to be created at-will that are instantiated with injectables
   * from both the {@link Injector} and the user.  The factory function will be passed verbatim to any instantiated
   * injectables that take it as constructor parameter.
   *
   * @param {String} injectableName
   * @returns {FactoryFunction}
   */
  factoryFunction(injectableName) {
    const self = this;

    /**
     * @param {...*} userSuppliedArgs
     */
    function theFactory() {
      const userSuppliedArgs = Array.from(arguments);

      return self.getInstance.apply(self, [injectableName, ...userSuppliedArgs]);
    }

    self.isFactoryFunction.set(theFactory, injectableName);

    return theFactory;
  }

  /**
   * @typedef {Function} ProviderFunction
   * @param {...*} params
   * @returns {T}
   * @template T
   */

  /**
   * Create a Provider that wraps a function for acquiring an object instance.  The Provider is suitable for passing to
   * {@link Injector#moduleGroup} as an injectable subject.
   *
   * <p>Use Providers whenever items you want to be injectables cannot be represented with a class or there are
   * complicating factors to acquiring the injectable.  For example, an asynchronously initialized item would be
   * wrapped with a Promise.  In that case, providerFunction would return a Promise to the item and the user would
   * be required to wait on the Promise to get access to the injectable instance.
   *
   * @param {ProviderFunction<T>} providerFunction a function that takes injectedParams plus optional
   * user-supplied arguments and returns an object.  injectedParams.length + numOfUserSuppliedArgs must exactly equal
   * the number of named parameters on the providerFunction.
   * @param {Number} numOfUserSuppliedArgs optional number of parameters that are expected to be passed from calls to
   * {@link Injector#getInstance} to the factory function when the returned Provider is the injectable subject.
   * Whenever the Injector calls the providerFunction, instances for the injectedParams will always be passed in-order
   * in the argument list to the providerFunction first, followed by all user-supplied args passed to
   * {@link Injector#getInstance}.  numberOfUserSuppliedArgs defaults to 0 if not specified.
   * @param {...(String|FactoryFunction)} injectedParams 0-or-more ordered, variable argument set of names of
   * injectables that must be instantiated by {@link #getInstance} or {@link #FactoryFunction}s that are passed as
   * arguments to the providerFunction.  When there are 1-or-more injectedParams, then numOfUserSuppliedArgs is
   * required and must be specified, even if its value is 0.
   * @template T object type returned from providerFunction
   * @returns {Provider} a Provider that can be passed to {@link #moduleGroup} as an injectable subject
   */
  createProvider(providerFunction, numOfUserSuppliedArgs) {
    const injectedParams = (arguments.length > 2) ? Array.from(arguments).slice(2) : [];

    if (injectableMetadata.isProviderFunctionAlreadyRegistered(providerFunction)) {
      throw new Error(`Factory function already registered as a Provider: ${
        InjectorUtils.getFunctionSignature(providerFunction)}`)
    }

    const metaObj = {
      injectedParams,
      injectedParamTypes: map(injectedParams, (injectedParam, idx) =>
        this.validateInjectedParam(injectedParam, idx, 'createProvider', `providerFunction: ${
          InjectorUtils.getFunctionSignature(providerFunction)}`)),
      numberOfUserSuppliedArgs: numOfUserSuppliedArgs,
      eager: false,
      scope: Scope.PROTOTYPE,
      flags: 0
    };

    if ((metaObj.injectedParams.length + metaObj.numberOfUserSuppliedArgs) !== providerFunction.length) {
      throw new Error(`createProvider: providerFunction named argument counts do not match. Expected ${
        metaObj.injectedParams.length} injectable arguments + ${
        metaObj.numberOfUserSuppliedArgs} user-supplied arguments, but providerFunction has ${
        providerFunction.length} named arguments. providerFunction: ${
        InjectorUtils.getFunctionSignature(providerFunction)}`);
    }

    class ProviderImpl extends Provider {
      constructor() {
        super(metaObj.injectedParams, metaObj.injectedParamTypes, metaObj.numberOfUserSuppliedArgs);
      }
    }

    const provider = new ProviderImpl();

    injectableMetadata.setProvider(provider, providerFunction);

    // copy metaObj properties into the metadata object for the provider
    Object.assign(injectableMetadata.findOrAddMetadataFor(provider), metaObj);

    return provider;
  }

  /**
   * Get an instance of named injectable.  If an existing, in-scope object can be found in cache, that instance will be
   * returned rather than a new instance.
   *
   * @param {String} name injectable name
   * @param {...*} assistedInjectionParams 0-or-more additional, user-supplied arguments that will get passed to the
   * provider or constructor function.
   * @template T
   * @returns {T} new or cached instance of named injectable as appropriate to the injectable's configured scope
   */
  getInstance(name) {
    const assistedInjectionParams = (arguments.length > 1) ? Array.from(arguments).slice(1) : [];

    return this.getInstanceRecursion(name, this.nameStack, this.scopeStack, assistedInjectionParams);
  }

  /**
   * A tuple containing an injectable name and injectable instance
   *
   * @typedef {{injectableName: String, instance: *}} InjectableInstance
   */

  /**
   * @param {String} name name of injectable
   * @returns {(Injectable|null)} injectable if found, otherwise null
   * @protected
   * @ignore
   */
  findInjectableByName(name) {
    for (let i = 0, ii = this.moduleGroups.length; i < ii; i += 1) {
      const injectable = this.moduleGroups[i].getInjectable(name);

      if (injectable) {
        return injectable;
      }
    }

    return null;
  }

  /**
   * @param {function(injectable:Injectable):boolean} booleanExpr
   * @returns {Array<Injectable>}
   * @protected
   * @ignore
   */
  injectableSearch(booleanExpr) {
    const resultSet = [];

    for (let i = 0, ii = this.moduleGroups.length; i < ii; i += 1) {
      const { injectables } = this.moduleGroups[i];
      for (let j = 0, jj = injectables.length; j < jj; j += 1) {
        const injectable = injectables[j];

        if (booleanExpr(injectable)) {
          resultSet.push(injectable);
        }
      }
    }

    return resultSet;
  }

  /**
   * Get instances of named Injectables hosted for a module group by module group name.
   *
   * @param {String} moduleGroupName
   * @returns {Array.<InjectableInstance>} list of tuples containing pairs of injectable name with an instance of the
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
      injectableName: injectable.name,
      instance: self.getInstanceForInjectable(injectable)
    }));
  }

  /**
   * Recursive internals for getInstance.
   *
   * @private
   * @ignore
   * @param {String} name
   * @param {Array.<String>} nameHistory stack of injectable names that are used to prevent circular dependencies
   * @param {Array.<Scope>} scopeHistory stack of scopes that match up with names
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters that will be passed to
   * top-level module factory injectables during recursion, otherwise empty array.
   * @returns {Object}
   * @throws {Error} when named injectable is not found
   */
  getInstanceRecursion(name, nameHistory, scopeHistory, assistedInjectionParams) {
    if (nameHistory.indexOf(name) !== -1) {
      const root = nameHistory[0];
      throw new Error(`Circular dependency in dependency graph for '${root}', name history stack: ${nameHistory}`);
    }

    const self = this;
    const injectable = self.findInjectableByName(name);
    if (injectable) {
      if (scopeHistory.length && scopeHistory[scopeHistory.length - 1] < injectable.scope) {
        const previousName = nameHistory[nameHistory.length - 1];
        throw new Error(`Cannot inject ${name} into ${previousName}, ${name} has a wider scope.`);
      }

      return self.getInstanceForInjectable(injectable, nameHistory, scopeHistory, assistedInjectionParams);
    }

    const additionalInfo = self.moduleGroups.length
        ? `module groups currently registered: ${map(self.moduleGroups, (moduleGroup) => moduleGroup.name)}`
        : (`${"no module groups were found.  Are you calling a different Injector instance than the one you expected?" +
            "  Current injector.id = "}${self.id}`);

    throw new Error(`Did not find any injectable for: ${name}; ${additionalInfo}`);
  }

  /**
   * @typedef {Function} JsuiceExtendCb
   * @param {InjectableMetadata} injectableMetadata
   * @param {DependencyGraph} dependencyGraph
   * @returns {Injector} extended injector
   */

  /**
   * Call user-supplied callback that can extend the injector and its constructor/prototype with additional
   * functionality.
   *
   * @param {JsuiceExtendCb} extendFtn
   * @ignore
   */
  applyExtensions(extendFtn) {
    return extendFtn(injectableMetadata, this.dependencyGraph);
  }

  /**
   * Fail if there are assistedInjectionParams passed to scopes/types that cannot support them
   * @private
   * @ignore
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
   * @param {Injectable} injectable
   * @param {Array.<String>=} nameHistory stack of injectable names that are used to prevent circular dependencies
   * @param {Array.<Scope>=} scopeHistory stack of scopes that match up with names
   * @param {Array.<*>=} assistedInjectionParams additional user-supplied parameters that will be passed to
   * top-level module factory injectables during recursion, otherwise empty array.
   * @returns {*}
   * @protected
   * @ignore
   */
  getInstanceForInjectable(injectable, nameHistory, scopeHistory, assistedInjectionParams) {
    const self = this;
    let instance;
    let singletonScope;

    if (isUndefined(nameHistory)) {
      nameHistory = self.nameStack;
    }
    if (isUndefined(scopeHistory)) {
      scopeHistory = self.scopeStack;
    }
    if (isUndefined(assistedInjectionParams)) {
      assistedInjectionParams = [];
    }

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
   * @package
   * @ignore
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
   * @ignore
   * @param {String} name
   * @return {ModuleGroup}
   */
  addModuleGroup(name) {
    const self = this;

    const existingModuleGroup = self.findModuleGroup(name);
    if (existingModuleGroup) {
      return existingModuleGroup;
    }

    const moduleGroup = new ModuleGroup(name, self.dependencyGraph, injectableMetadata);
    self.moduleGroups.push(moduleGroup);

    return moduleGroup;
  }

  /**
   * Used in testing to reset Injector internals.  Do not call.
   *
   * @package
   * @ignore
   * @param {Scope} scope
   */
  clearScope(scope) {
    forEach(keys(Scope), scopeName => {
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
   * @ignore
   * @param {Injectable} injectable
   * @param {Array.<String>} nameHistory
   * @param {Array.<Scope>} scopeHistory
   * @param {Array.<*>} assistedInjectionParams additional user-supplied parameters that will be passed to
   * top-level module factory injectables during recursion, otherwise empty array.
   * @returns {Object}
   */
  newInjectableInstance(injectable, nameHistory, scopeHistory, assistedInjectionParams) {
    const params = map(injectable.injectedParams, (injectedParam, idx) => {
      switch (injectable.injectedParamTypes[idx]) {
        case InjectedParamType.INJECTABLE_NAME:
          // assistedInjectionParams is never passed along to dependencies, always passing empty set from this point on
          return this.getInstanceRecursion(injectedParam, nameHistory, scopeHistory, []);
        case InjectedParamType.FACTORY_FUNCTION:
          return injectedParam;
        default:
          throw new Error(`Unknown InjectableParamType for injectable ${injectable.name}, `)
      }
    });

    return injectable.newInstance(params, assistedInjectionParams);
  }
}

/**
 * InjectableType enum
 * @name Injector#InjectableType
 * @type {typeof InjectableType}
 * @const
 */
Object.defineProperty(Injector.prototype, 'InjectableType', {
  configurable: false,
  enumerable: true,
  writable: false,
  value: InjectableType
});

/**
 * Scope enum
 * @name Injector#Scope
 * @type {typeof Scope}
 * @const
 */
Object.defineProperty(Injector.prototype, 'Scope', {
  configurable: false,
  enumerable: true,
  writable: false,
  value: Scope
});

/**
 * Flags enum
 * @name Injector#Flags
 * @type {typeof Flags}
 * @const
 */
Object.defineProperty(Injector.prototype, 'Flags', {
  configurable: false,
  enumerable: true,
  writable: false,
  value: Flags
});


module.exports = Injector;

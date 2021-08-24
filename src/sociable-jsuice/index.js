/* eslint-disable no-bitwise,prefer-rest-params,no-param-reassign,prefer-spread,no-underscore-dangle,no-unused-vars,func-names,consistent-return */
// noinspection JSBitwiseOperatorUsage,JSCommentMatchesSignature

const td = require('testdouble');
const forEach = require('lodash.foreach');
const reduce = require('lodash.reduce');
const union = require('lodash.union');
const map = require('lodash.map');
const filter = require('lodash.filter');
const keys = require('lodash.keys');
const has = require('lodash.has');
const isArray = require('lodash.isarray');
const isFunction = require('lodash.isfunction');
const isUndefined = require('lodash.isundefined');
const classInfo = require('class-info');
const { getCallId } = require('call-id');

const injector = require('../jsuice');
const Scope = require('../jsuice/lib/Scope');
const InjectableType = require('../jsuice/lib/InjectableType');
const SystemUnderTest = require('./lib/SystemUnderTest');
const SystemUnderTestInstancer = require('./lib/SystemUnderTestInstancer');
const PartialMockCollaborator = require('./lib/PartialMockCollaborator');
const MockCollaborator = require('./lib/MockCollaborator');
const InjectorEnvironment = require('./lib/InjectorEnvironment');
const TestCollaborators = require('./lib/TestCollaborators');
const Injector = require('../jsuice/lib/Injector');

let collaboratorSetupCalled = false;

const sociableInjector = injector.applyExtensions((injectableMetadata, dependencyGraph) => {
  const realGetInstanceForInjectable = Injector.prototype.getInstanceForInjectable;

  let inRehearsals = 0;
  let testCollaborators = null;
  let shadowedMocked = {};
  let shadowedPartialMocked = {};
  let shadowedReal = {};
  let partialMockFactories = {};
  let testCaseContext = null;

  /**
   * @type {WeakMap.<InjectableMetadata.Collection,Function>}
   */
  const defaultCustomizers = new WeakMap();

  /**
   * @ignore
   * @type {{__uninitialized__: boolean}}
   */
  const UNINITIALIZED = { '__uninitialized__': true };

  const jsuiceEnv = process.env.JSUICE_ENV;
  const validEnvKeys = map(keys(InjectorEnvironment), key => key.toLowerCase());
  if (isUndefined(jsuiceEnv) || validEnvKeys.indexOf(jsuiceEnv.toLowerCase()) < 0) {
    throw new Error(`JSUICE_ENV environment variable required in test runner process with one of the following: ${
      validEnvKeys}`);
  }
  const jsuiceEnvironmentName = jsuiceEnv.toUpperCase();
  const jsuiceEnvironment = InjectorEnvironment[jsuiceEnvironmentName];

  /**
   * @param {Object} instanceTracker
   * @param {Injectable} injectable
   * @returns {Array}
   */
  function findOrCreateInstanceContainerForInjectable(instanceTracker, injectable) {
    const container = (instanceTracker[injectable.name] === UNINITIALIZED) ? [] : instanceTracker[injectable.name];

    instanceTracker[injectable.name] = container;

    return container;
  }

  /**
   * @param {Injectable} injectable injectable
   * @param {Array.<*>} container instance container for injectable
   * @returns {boolean} is the 0th item in container a SINGLETON-scoped instance of injectable
   */
  function isSingletonAllocatedInInjectableContainer(injectable, container) {
    return injectable.scope === Scope.SINGLETON && container.length > 0;
  }

  const spiesInstalled = new WeakMap();

  function spyClass(clazz) {
    const typeInfo = classInfo(clazz);
    if (typeInfo.parentClass) {
      spyClass(typeInfo.parentClass);
    }

    forEach(typeInfo.instanceMethods, instanceMethodName => {
      const realMethod = clazz.prototype[instanceMethodName];
      const spyMethod = td.replace(clazz.prototype, instanceMethodName, td.function(instanceMethodName));

      td.when(spyMethod(), {ignoreExtraArgs: true}).thenDo(function() {
        if (!inRehearsals) {
          return realMethod.apply(this, Array.from(arguments));
        }
      }); // DO NOT use fat arrow here so we get the 'this' sent to us by the testdouble library
    });

    forEach(typeInfo.staticMethods, staticMethodName => {
      const realMethod = clazz[staticMethodName];
      const spyMethod = td.replace(clazz, staticMethodName, td.function(staticMethodName));

      td.when(spyMethod(), {ignoreExtraArgs: true}).thenDo(function() {
        if (!inRehearsals) {
          return realMethod.apply(clazz, Array.from(arguments));
        }
      }); // DO NOT use fat arrow here
    });

    spiesInstalled.set(clazz, true);

    return clazz;
  }

  function spyObject(instance) {
    const functionProps = filter(keys(instance), (key) => isFunction(instance[key]));

    forEach(functionProps, (functionProp) => {
      const realMethod = instance[functionProp];
      const spyMethod = td.replace(instance, functionProp, td.function(functionProp));

      td.when(spyMethod(), {ignoreExtraArgs: true}).thenDo(function() {
        if (!inRehearsals) {
          return realMethod.apply(instance, Array.from(arguments));
        }
      }); // DO NOT use fat arrow here
    });

    spiesInstalled.set(instance, true);
  }

  /**
   * Mocking override for internal method {@link Injector#getInstanceForInjectable}
   *
   * @memberOf Injector.prototype
   * @param {Injectable} injectable
   * @param {Array.<String>=} nameHistory stack of injectable names that are used to prevent circular dependencies
   * @param {Array.<Scope>=} scopeHistory stack of scopes that match up with names
   * @param {Array.<*>=} assistedInjectionParams additional user-supplied parameters that will be passed to
   * @returns {(*|td.DoubledObject<*>)}
   * @this {Injector}
   * @protected
   * @ignore
   */
  Injector.prototype.getInstanceForInjectable = function(injectable, nameHistory, scopeHistory,
                                                         assistedInjectionParams) {
    if (!collaboratorSetupCalled) {
      throw new Error('Call injector.collaborators before trying to construct instances with the injector');
    }

    const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);
    if (has(shadowedMocked, injectable.name)) {
      if (metaObj.numberOfUserSuppliedArgs > 0) {
        throw new Error(`Assisted injection not yet supported in sociable-jsuice tests, ${
          injectable.name} was the requested injectable.`);
      }

      const instance = injectable.type === InjectableType.INJECTED_CONSTRUCTOR ?
        td.instance(injectable.subject) :
        td.object();

      const defaultCustomizer = this.getDefaultCustomizer(metaObj);
      if (defaultCustomizer) {
        defaultCustomizer(injectable.name, instance, this.getInjectorContext());
      }

      const collabConfig = testCollaborators.mocks[injectable.name];
      if (collabConfig && collabConfig.customizer) {
        collabConfig.customizer(instance);
      }

      shadowedMocked[injectable.name] = instance;
      return instance;
    }

    if (has(shadowedPartialMocked, injectable.name)) {
      const collabConfig = testCollaborators.partialMocks[injectable.name];
      let assistedParams = assistedInjectionParams;
      if (!assistedParams && collabConfig && collabConfig.assistedInjectionParams) {
        assistedParams = collabConfig.assistedInjectionParams;
      }

      // const container = findOrCreateInstanceContainerForInjectable(shadowedPartialMocked, injectable);
      // if (isSingletonAllocatedInInjectableContainer(injectable, container)) {
      //   return container[0];
      // }
      //
      let instance;

      switch (injectable.type) {
        case InjectableType.INJECTED_CONSTRUCTOR:
          if (!spiesInstalled.has(injectable.subject)) {
            td.replace(injectable, 'subject', spyClass(injectable.subject));
          }

          // call through to the real injector as if subject on injectable were a normal class where all the members are
          // now spies
          instance = realGetInstanceForInjectable.call(injector, injectable, nameHistory, scopeHistory, assistedParams);
          break;

        case InjectableType.PROVIDER:
          // call through to the real injector and get an instance
          instance = realGetInstanceForInjectable.call(injector, injectable, nameHistory, scopeHistory, assistedParams);

          if (!spiesInstalled.has(instance)) {
            spyObject(instance);
          }
          break;

        default:
          throw new Error(`Partial mocks only supported for constructor functions or providers in sociable tests, ${
            injectable.name} was the requested injectable.`);
      }

      const defaultCustomizer = this.getDefaultCustomizer(metaObj);
      if (defaultCustomizer) {
        defaultCustomizer(injectable.name, instance, this.getInjectorContext());
      }

      if (collabConfig && collabConfig.customizer) {
        collabConfig.customizer(instance);
      }

      shadowedPartialMocked[injectable.name] = instance;
      return instance;
    }

    if (has(shadowedReal, injectable.name)) {
      // const container = findOrCreateInstanceContainerForInjectable(shadowedReal, injectable);
      // if (isSingletonAllocatedInInjectableContainer(injectable, container)) {
      //   return container[0];
      // }

      const sutConfig = testCollaborators.sut[injectable.name];

      // if real is the sut, we might also have assistedInjectionParams
      const assistedInjectionParams = sutConfig ? sutConfig.assistedInjectionParams : [];

      let assistedParams = assistedInjectionParams;
      if (!assistedParams && sutConfig && sutConfig.assistedInjectionParams) {
        assistedParams = sutConfig.assistedInjectionParams;
      }

      const instance = realGetInstanceForInjectable.call(injector, injectable, nameHistory, scopeHistory,
        assistedParams);

      shadowedReal[injectable.name] = instance;
      return instance;
    }

    throw new Error(`sociable-jsuice got request for an injectable, ${
      injectable.name}, that was not listed in injector.collaboratorSetup nor a dependency thereof.`);
  };

  function collaboratorRetrieved(collaboratorName) {
    if (!isUndefined(shadowedPartialMocked[collaboratorName])) {
      return shadowedPartialMocked[collaboratorName];
    }
    if (!isUndefined(shadowedMocked[collaboratorName])) {
      return shadowedMocked[collaboratorName];
    }
    if (!isUndefined(shadowedReal[collaboratorName])) {
      return shadowedReal[collaboratorName];
    }
  }

  /**
   * This function is our chance to discover what objects need to be shadowed for the current test.
   *
   * @memberOf Injector.prototype
   * @param {...Collaborator} collaboratorDescriptors
   * @returns {Array.<*>} List of instantiated collaborators ordered the same way as collaboratorDescriptors
   * @public
   */
  Injector.prototype.collaborators = function(collaboratorDescriptors) {
    inRehearsals = true;

    try {
      collaboratorSetupCalled = true;

      testCollaborators = TestCollaborators.create(
        injector,
        injectableMetadata,
        dependencyGraph,
        Array.from(arguments)); // arguments is the list of collaboratorDescriptors

      shadowedPartialMocked = {};
      shadowedMocked = {};
      shadowedReal = {};
      partialMockFactories = {};

      const sutKeys = keys(testCollaborators.sut);
      const realKeys = testCollaborators.reals;
      const mockKeys = keys(testCollaborators.mocks);
      const partialMockKeys = keys(testCollaborators.partialMocks);
      const instancers = keys(testCollaborators.instancerFunctions);

      forEach(realKeys, collabName => {
        shadowedReal[collabName] = UNINITIALIZED;
      });
      forEach(mockKeys, collabName => {
        shadowedMocked[collabName] = UNINITIALIZED;
      });
      forEach(partialMockKeys, collabName => {
        shadowedPartialMocked[collabName] = UNINITIALIZED;
      });

      // Sort collaborators in dependent-dependency order
      const allCollaborators = union(sutKeys, realKeys, mockKeys, partialMockKeys).sort((a, b) => {
        const descendantVertexes = dependencyGraph.getAllDependenciesAndDescendants(b);
        const descendants = map(descendantVertexes, (descendantVertex) => descendantVertex.name);

        // if a is a descendant of b, then b needs to come first
        if (descendants.indexOf(a) >= 0) {
          return 1;
        }
        return -1;
      });

      // instantiated collaborators
      const collaboratorsAndDependencies = {};

      forEach(allCollaborators, (collaboratorName) => {
        // Do nothing if collaboratorName was not named as one of the collaboratorDescriptors by the caller
        if (testCollaborators.collaboratorNames.indexOf(collaboratorName) < 0) {
          return;
        }

        const alreadyRetrieved = collaboratorRetrieved(collaboratorName);
        if (alreadyRetrieved !== UNINITIALIZED) {
          collaboratorsAndDependencies[collaboratorName] = alreadyRetrieved;
        } else if (realKeys.indexOf(collaboratorName) >= 0 || partialMockKeys.indexOf(collaboratorName) >= 0) {
          if (has(testCollaborators.instancerFunctions, collaboratorName)) {
            collaboratorsAndDependencies[collaboratorName] = testCollaborators.instancerFunctions[collaboratorName];
          } else {
            collaboratorsAndDependencies[collaboratorName] = injector.getInstance(collaboratorName);
          }
        } else if (mockKeys.indexOf(collaboratorName) >= 0) {
          collaboratorsAndDependencies[collaboratorName] = injector.getInstance(collaboratorName);
        }
      });

      // return the requested collaborators in the order they were requested
      return map(testCollaborators.collaboratorNames, name => collaboratorsAndDependencies[name]);
    } finally {
      inRehearsals = false;
    }
  };

  /**
   * @memberOf Injector.prototype
   * @returns {Object.<String,*>} context object
   * @public
   */
  Injector.prototype.getInjectorContext = function() {
    if (testCaseContext === null) {
      throw new Error("An injector context is available only when a test is running");
    }
    return testCaseContext;
  };

  const JAVASCRIPT_FILE = /^(.*)\.js$/;

  /**
   * Finds the default customizer for injectable described by metadataCollection, but only in the SOCIABLE
   * environment.
   *
   * @param {InjectableMetadata.Collection} metadataCollection
   * @returns {(undefined|Function)} returns mock customizer when caller is in the SOCIABLE runtime environment
   */
  Injector.prototype.getDefaultCustomizer = function(metadataCollection) {
    if (!metadataCollection.fetchedDefaultCustomizer && jsuiceEnvironment === InjectorEnvironment.SOCIABLE) {
      metadataCollection.fetchedDefaultCustomizer = true;

      if (JAVASCRIPT_FILE.test(metadataCollection.moduleFilePath)) {
        const mockFilename = metadataCollection.moduleFilePath.replace(JAVASCRIPT_FILE, '$1.mock.js');

        try {
          const mockCustomizer = /** @type {CustomizerFunction} */ module.require(mockFilename);

          if (mockCustomizer) {
            defaultCustomizers.set(metadataCollection, mockCustomizer);
          }
        } catch (e) {
          // no default mock defined for ctor
        }
      }
    }

    return defaultCustomizers.get(metadataCollection);
  };

  /**
   * Configures {@link injector#collaborators} to return a mock for injectableName.
   *
   * @memberOf Injector.prototype
   * @param {String} injectableName name of the injectable that you want the injector to mock
   * @param {CustomizerFunction=} customizer
   * optional callback that gets called with the mockObj created to mimic injectableName's injectable.  You may
   * further customize mockObj with the
   * {@link https://github.com/testdouble/testdouble.js#tdwhen-for-stubbing-responses td.when} API in the customizer.
   * context is an object created for each test case that is passed to the customizer functions and that can be
   * used to share state between the test and mocks.
   * @returns {MockCollaborator} the configuration for a mock that can be passed to {@link Injector#collaborators}
   * @this {Injector}
   * @public
   */
  Injector.prototype.mock = function(injectableName, customizer) {
    const context = this.getInjectorContext();

    if (customizer) {
      return new MockCollaborator(injectableName, mockObj => {
        customizer(injectableName, mockObj, context);
      });
    }

    return new MockCollaborator(injectableName);
  };

  /**
   * Configures {@link injector#collaborators} to return a partial mock for injectableName.  All enumerable
   * instance and static methods on the injectable are monkey patched with
   * {@link https://github.com/testdouble/testdouble.js#tdfunc td.function}s and unless directed to behave otherwise
   * with {@link https://github.com/testdouble/testdouble.js#tdwhen-for-stubbing-responses td.when}, these
   * td.functions will call through to real injectable instance - essentially acting as a spy.
   *
   * @memberOf Injector.prototype
   * @param {String} injectableName name of the injectable that you want the injector to partial mock
   * @param {CustomizerFunction=} customizer
   * optional callback that gets called with the mockObj created to mimic injectableName's injectable.  You may
   * further customize mockObj with the
   * {@link https://github.com/testdouble/testdouble.js#tdwhen-for-stubbing-responses td.when} API in the customizer.
   * context is an object created for each test case that is passed to the customizer functions and that can be
   * used to share state between the test and mocks.
   * @param {...*} assistedInjectionParams assisted injection params that are passed to the injectable when it is
   * constructed.  These may be mocks or real as appropriate for your test case.  If 1-or-more assistedInjectionParams
   * are required for injectableName to be instantiated, then customizer is required (even if it is a no-op function).
   * @returns {PartialMockCollaborator} the configuration for a partial mock that can be passed to
   * {@link Injector#collaborators}
   * @public
   */
  Injector.prototype.partialMock = function(injectableName, customizer) {
    const args = Array.from(arguments);

    if (args.length > 1 && !isFunction(customizer)) {
      throw new Error(`partialMock: for injectableName ${injectableName} customizer passed was not a function`);
    }

    const assistedInjectionParams = (args.length > 2) ? args.slice(2) : [];

    if (customizer) {
      const context = this.getInjectorContext();
      return new PartialMockCollaborator(injectableName, assistedInjectionParams, mockObj => {
        customizer(injectableName, mockObj, context);
      });
    }

    return new PartialMockCollaborator(injectableName, assistedInjectionParams);
  };

  /**
   * @memberOf Injector.prototype
   * @param injectableName
   * @returns {SystemUnderTest}
   */
  Injector.prototype.systemUnderTest = function(injectableName) {
    const assistedInjectionParams = Array.from(arguments).slice(1);

    return new SystemUnderTest(injectableName, assistedInjectionParams);
  };

  /**
   * @memberOf Injector.prototype
   * @param injectableName
   * @returns {SystemUnderTestInstancer}
   */
  Injector.prototype.systemUnderTestInstancer = function(injectableName) {
    return new SystemUnderTestInstancer(injectableName);
  };

  /**
   * If the current JSUICE_ENV matches whichEnvironment, then configurator will be run immediately.  Otherwise, no
   * action is taken.  Place calls to {@link #environmentTeardown} at the top of your test as a pre-condition or in a
   * <code>beforeEach</code> block to do environment-specific mock configurations or data source configurations.
   *
   * @memberOf Injector.prototype
   * @param {(Array.<InjectorEnvironment>|InjectorEnvironment)} whichEnvironment
   * @param {function(whichEnvironment:InjectorEnvironment)} configurator
   */
  Injector.prototype.environmentSetup = function(whichEnvironment, configurator) {
    const envArray = isArray(whichEnvironment) ? whichEnvironment : [ whichEnvironment ];
    if (envArray.indexOf(jsuiceEnvironment) >= 0 && isFunction(configurator)) {
      configurator(jsuiceEnvironment);
    }
  };

  /**
   * If the current JSUICE_ENV matches whichEnvironment, then configurator will be run immediately.  Otherwise, no
   * action is taken.  Place calls to {@link #environmentTeardown} at the bottom of your test as a post-condition or in
   * a <code>afterEach</code> block to do environment-specific teardown or assertions.
   *
   * @memberOf Injector.prototype
   * @param {(Array.<InjectorEnvironment>|InjectorEnvironment)} whichEnvironment
   * @param {function(whichEnvironment:InjectorEnvironment)} configurator
   */
  Injector.prototype.environmentTeardown = function(whichEnvironment, configurator) {
    const envArray = isArray(whichEnvironment) ? whichEnvironment : [ whichEnvironment ];
    if (envArray.indexOf(jsuiceEnvironment) >= 0 && isFunction(configurator)) {
      configurator(jsuiceEnvironment);
    }
  };

  /**
   * This is an extension of {@link Injector}'s {@link Injector#instancer instancer} method to allow tests to supply
   * default parameters for assisted injections so that individual tests need not repeatedly do so.
   *
   * <p>{@link Instancer} functions can be passed to {@link Injector#collaborators collaborators} to describe an
   * injectable parameter and characterize the instancer for the current test case.  When {@link Instancer#instancer}
   * is used in the context of {@link Injector#collaborators}, each parameter passed is expected to be a function that
   * the test passes to supply a default user-supplied arg for when {@link Injector#getInstance} is called as part of
   * the setup of the test case.  Parameters passed to the {@link Instancer} function in the context of the test always
   * take precedence over the assistedInjectionDefaultParams passed to {@link Injector#instancer} here.
   * assistedInjectionDefaultParams are optional.
   *
   * @memberOf Injector.prototype
   * @param {String} injectableName
   * @param {...function():*} assistedInjectionDefaultParams 0-or-more functions for generating default assisted
   * injection parameters for injectableName.  assistedInjectionDefaultParams are optional
   * @returns {Instancer}
   */
  Injector.prototype.instancer = function(injectableName) {
    const self = this;

    const assistedInjectionDefaults = (arguments.length > 1) ? Array.from(arguments).slice(1) : [];

    /**
     * @param {...*} userSuppliedArgs
     */
    function theInstancer() {
      const userSuppliedArgs = Array.from(arguments);
      const overlaidAtopDefaults = [];

      for (let i = 0, ii = Math.max(assistedInjectionDefaults.length, userSuppliedArgs.length); i < ii; i += 1) {
        if (userSuppliedArgs.length > i) {
          overlaidAtopDefaults.push(userSuppliedArgs[i]);
        } else {
          const defaultCb = assistedInjectionDefaults[i];
          if (!isFunction(defaultCb)) {
            throw new Error(`instancer for injectable ${
              injectableName} received an assistedInjectionDefaultParam that was not a function`);
          }
          overlaidAtopDefaults.push(defaultCb());
        }
      }

      // overlaidAtopDefaults MUST be the expected length of userSuppliedArgs or will result in a standard J'suice
      // validation error inside the call to getInstance
      return self.getInstance.apply(self, [ injectableName, ...overlaidAtopDefaults ]);
    }

    self.isInstancerFunction.set(theInstancer, injectableName);

    return theInstancer;
  };

  /**
   * @memberOf Injector.prototype
   */
  Injector.prototype.InjectorEnvironment = InjectorEnvironment;

  beforeEach(() => {
    collaboratorSetupCalled = false;
    testCaseContext = {};
  });

  afterEach(() => {
    td.reset();

    injector.clearScope(Scope.SINGLETON);
    injector.clearScope(Scope.APPLICATION);

    shadowedReal = {};
    shadowedPartialMocked = {};

    // TODO: reset mocks and put them into a pool rather than clearing the map and allowing them to garbage collect here

    shadowedMocked = {};
    testCaseContext = null;
  });

  return injector;
});

module.exports = sociableInjector;

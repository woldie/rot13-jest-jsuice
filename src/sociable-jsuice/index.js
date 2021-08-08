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
const injector = require('../jsuice');
const Scope = require('../jsuice/lib/Scope');
const InjectableType = require('../jsuice/lib/InjectableType');
const SystemUnderTest = require('./lib/SystemUnderTest');
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
      }); // DO NOT use fat arrow here
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

    if (has(shadowedMocked, injectable.name)) {
      const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);
      if (metaObj.numberOfUserSuppliedArgs > 0) {
        throw new Error(`Assisted injection not yet supported in sociable-jsuice tests, ${
          injectable.name} was the requested injectable.`);
      }

      const instance = injectable.type === InjectableType.INJECTED_CONSTRUCTOR ?
        td.instance(injectable.subject) :
        td.object();

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
      if (collabConfig) {
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

      const instance = realGetInstanceForInjectable.call(injector, injectable, nameHistory, scopeHistory,
        (sutConfig ? sutConfig.assistedInjectionParams : assistedInjectionParams));

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
        const alreadyRetrieved = collaboratorRetrieved(collaboratorName);
        if (alreadyRetrieved !== UNINITIALIZED) {
          collaboratorsAndDependencies[collaboratorName] = alreadyRetrieved;
        } else if (realKeys.indexOf(collaboratorName) >= 0) {
          collaboratorsAndDependencies[collaboratorName] = injector.getInstance(collaboratorName);
        } else if (partialMockKeys.indexOf(collaboratorName) >= 0) {
          if (has(testCollaborators.factoryFunctions, collaboratorName)) {
            collaboratorsAndDependencies[collaboratorName] = testCollaborators.factoryFunctions[collaboratorName];
          } else {
            collaboratorsAndDependencies[collaboratorName] = injector.getInstance(collaboratorName);
          }
        } else if (mockKeys.indexOf(collaboratorName) >= 0) {
          collaboratorsAndDependencies[collaboratorName] = injector.getInstance(collaboratorName);
        }
      });

      // const realCollaborators = [ ...sutKeys, ...testCollaborators.reals ];
      // reduce(realCollaborators, (accumulator, collaboratorName) => {
      //   const sutConfig = testCollaborators.sut[collaboratorName];
      //
      //   // if real is the sut, we might also have assistedInjectionParams
      //   const assistedInjectionParams = sutConfig ? sutConfig.assistedInjectionParams : [];
      //
      //   accumulator.collaboratorsAndDependencies[collaboratorName] = shadowedReal[collaboratorName] === UNINITIALIZED ?
      //     injector.getInstance.apply(injector, [ collaboratorName, ...assistedInjectionParams ]) :
      //
      //     // TODO: these "shadowed" containers are really meant to capture the SUT and its dependencies as they are
      //     //  instantiated, and only while collaborators is running.  They should be captured in the
      //     //  getInstanceForInjectable, not here.  And we should sort the injectable names by dependent order here so
      //     //  that we get capture the dependencies from bottom up.  Also, factory functions should not be allowed to be
      //     //  re-entrant with getInstance - they must be called standalone or else we risk getting weird circular
      //     //  dependencies.
      //     shadowedReal[collaboratorName][0];
      //
      //   return accumulator;
      // }, {
      //   collaboratorsAndDependencies
      // });
      //
      // reduce(shadowedPartialMocked, (accumulator, value, collaboratorName) => {
      //   if (shadowedPartialMocked[collaboratorName] === UNINITIALIZED) {
      //
      //     if (has(testCollaborators.factoryFunctions, collaboratorName)) {
      //       accumulator.collaboratorsAndDependencies[collaboratorName] =
      //         testCollaborators.factoryFunctions[collaboratorName];
      //     } else {
      //       const collabConfig = testCollaborators.partialMocks[collaboratorName];
      //       const partialMock = injector.getInstance.apply(injector, [
      //         collaboratorName,
      //         ...collabConfig.assistedInjectionParams
      //       ]);
      //
      //       if (collabConfig && collabConfig.customizer) {
      //         collabConfig.customizer(collaboratorName, partialMock);
      //       }
      //
      //       accumulator.collaboratorsAndDependencies[collaboratorName] = partialMock;
      //     }
      //   } else {
      //     accumulator.collaboratorsAndDependencies[collaboratorName] = shadowedPartialMocked[collaboratorName];
      //   }
      //
      //   return accumulator;
      // }, {
      //   collaboratorsAndDependencies
      // });
      //
      // reduce(shadowedMocked, (accumulator, value, collaboratorName) => {
      //   if (shadowedMocked[collaboratorName] === UNINITIALIZED) {
      //     const mock = injector.getInstance(collaboratorName);
      //
      //     const collabConfig = testCollaborators.mocks[collaboratorName];
      //     if (collabConfig && collabConfig.customizer) {
      //       collabConfig.customizer(collaboratorName, mock);
      //     }
      //
      //     accumulator.collaboratorsAndDependencies[collaboratorName] = mock;
      //   } else {
      //     accumulator.collaboratorsAndDependencies[collaboratorName] = shadowedMocked[collaboratorName];
      //   }
      //
      //   return accumulator;
      // }, {
      //   collaboratorsAndDependencies
      // });

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

  /**
   * Configures {@link injector#collaborators} to return a mock for injectableName.
   *
   * @memberOf Injector.prototype
   * @param {String} injectableName name of the injectable that you want the injector to mock
   * @param {?function(injectableName:String,mockObj:td.DoubledObject<*>,context:Object<String,*>)} customizer
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
   * @param {?function(injectableName:String,mockObj:td.DoubledObject<*>,context:Object<String,*>)} customizer
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
   * This is an extension of the base Injector's factoryFunction method to allow tests to generate default parameters
   * for assisted injections so that individual tests need not repeatedly do so.
   *
   * @memberOf Injector.prototype
   * @param {String} injectableName
   * @param {...function():*} assistedInjectionDefaultParams 0-or-more functions for generating default assisted
   * injection parameters for injectableName
   * @returns {FactoryFunction}
   */
  Injector.prototype.factoryFunction = function(injectableName) {
    const self = this;

    const assistedInjectionDefaults = (arguments.length > 1) ? Array.from(arguments).slice(1) : [];

    /**
     * @param {...*} userSuppliedArgs
     */
    function theFactory() {
      const userSuppliedArgs = Array.from(arguments);
      const overlaidAtopDefaults = [];

      for (let i = 0, ii = Math.max(assistedInjectionDefaults.length, userSuppliedArgs.length); i < ii; i += 1) {
        if (userSuppliedArgs.length > i) {
          overlaidAtopDefaults.push(userSuppliedArgs[i]);
        } else {
          const defaultCb = assistedInjectionDefaults[i];
          if (!isFunction(defaultCb)) {
            throw new Error(`factoryFunction for injectable ${
              injectableName} received an assistedInjectionDefaultParam that was not a function`);
          }
          overlaidAtopDefaults.push(defaultCb());
        }
      }

      return self.getInstance.apply(self, [injectableName, ...overlaidAtopDefaults]);
    }

    self.isFactoryFunction.set(theFactory, injectableName);

    return theFactory;
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

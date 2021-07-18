/* eslint-disable no-bitwise,prefer-rest-params,no-param-reassign,prefer-spread,no-underscore-dangle,no-unused-vars */
// noinspection JSBitwiseOperatorUsage

const td = require('testdouble');
const forEach = require('lodash.foreach');
const reduce = require('lodash.reduce');
const map = require('lodash.map');
const keys = require('lodash.keys');
const has = require('lodash.has');
const isFunction = require('lodash.isfunction');
const classInfo = require('class-info');
const injector = require('../jsuice');
const Scope = require('../jsuice/lib/Scope');
const InjectableType = require('../jsuice/lib/InjectableType');
const { SystemUnderTest, MockCollaborator, PartialMockCollaborator, TestCollaborators } = require('./lib/Types');

let collaboratorSetupCalled = false;

/**
 * @class Injector
 */

/**
 * @type {Injector}
 */
const sociableInjector = injector.extend((Injector, injectableMetadata, dependencyGraph) => {
  const realGetInstanceForInjectable = Injector.prototype.getInstanceForInjectable;

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

  function isSpyClass(clazz) {
    return clazz.__isSpy || false;
  }

  function spyClass(clazz) {
    const typeInfo = classInfo(clazz);
    if (typeInfo.parentClass) {
      spyClass(typeInfo.parentClass);
    }

    forEach(typeInfo.instanceMethods, instanceMethodName => {
      const realMethod = clazz.prototype[instanceMethodName];
      const spyMethod = td.replace(clazz.prototype, instanceMethodName, td.function(instanceMethodName));

      td.when(spyMethod(), {ignoreExtraArgs: true})
        .thenDo(() => realMethod.apply(this, Array.from(arguments)));
    });

    forEach(typeInfo.staticMethods, staticMethodName => {
      const realMethod = clazz[staticMethodName];
      const spyMethod = td.replace(clazz, staticMethodName, td.function(staticMethodName));

      td.when(spyMethod(), {ignoreExtraArgs: true})
        .thenDo(() => realMethod.apply(clazz, Array.from(arguments)));
    });

    clazz.__isSpy = true;

    return clazz;
  }

  /**
   * @param {Injectable} injectable
   * @param {Array.<String>=} nameHistory stack of injectable names that are used to prevent circular dependencies
   * @param {Array.<Scope>=} scopeHistory stack of scopes that match up with names
   * @param {Array.<*>=} assistedInjectionParams additional user-supplied parameters that will be passed to
   * @returns {(*|td.DoubledObject<*>)}
   * @protected
   * @ignore
   */
  Injector.prototype.getInstanceForInjectable = (injectable, nameHistory, scopeHistory,
                                                 assistedInjectionParams) => {
    if (!collaboratorSetupCalled) {
      throw new Error('Call injector.collaborators before trying to construct instances with the injector');
    }

    if (has(shadowedMocked, injectable.name)) {
      const container = findOrCreateInstanceContainerForInjectable(shadowedMocked, injectable);
      if (isSingletonAllocatedInInjectableContainer(injectable, container)) {
        return container[0];
      }

      const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);
      if (metaObj.numberOfUserSuppliedArgs > 0) {
        throw new Error(`Assisted injection not yet supported in sociable-jsuice tests, ${
          injectable.name} was the requested injectable.`);
      }

      const instance = injectable.type === InjectableType.INJECTED_CONSTRUCTOR ?
        td.instance(injectable.subject) :
        td.object();
      container.push(instance);
      return instance;
    }

    if (has(shadowedPartialMocked, injectable.name)) {
      if (injectable.type !== InjectableType.INJECTED_CONSTRUCTOR) {
        // TODO support other injectable types for partial mocks
        throw new Error(`Partial mocks currently only supported for constructor functions in sociable-jsuice tests, ${
          injectable.name} was the requested injectable.`);
      }

      const container = findOrCreateInstanceContainerForInjectable(shadowedPartialMocked, injectable);
      if (isSingletonAllocatedInInjectableContainer(injectable, container)) {
        return container[0];
      }

      if (!isSpyClass(injectable.subject)) {
        td.replace(injectable, 'subject', spyClass(injectable.subject));
      }

      // call through to the real injector as if subject on injectable were a normal class where all the members are
      // now spies
      const instance = realGetInstanceForInjectable.call(injector, injectable, nameHistory, scopeHistory,
        assistedInjectionParams);
      container.push(instance);
      return instance;
    }

    if (has(shadowedReal, injectable.name)) {
      const container = findOrCreateInstanceContainerForInjectable(shadowedReal, injectable);
      if (isSingletonAllocatedInInjectableContainer(injectable, container)) {
        return container[0];
      }

      const instance = realGetInstanceForInjectable.call(injector, injectable, nameHistory, scopeHistory,
        assistedInjectionParams);
      container.push(instance);
      return instance;
    }

    throw new Error(`sociable-jsuice got request for an injectable, ${
      injectable.name}, that was not listed in injector.collaboratorSetup nor a dependency thereof.`);
  };

  /**
   * This function is our chance to discover what objects need to be shadowed for the current test.
   *
   * @param {...Collaborator} collaboratorDescriptors
   * @returns {Array.<*>} List of instantiated collaborators ordered the same way as collaboratorDescriptors
   * @public
   */
  Injector.prototype.collaborators = (collaboratorDescriptors) => {
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

    forEach(sutKeys, collabName => {
      shadowedReal[collabName] = UNINITIALIZED;
    });
    forEach(testCollaborators.reals, collabName => {
      shadowedReal[collabName] = UNINITIALIZED;
    });
    forEach(testCollaborators.mocks, (mockConfig, collabName) => {
      shadowedMocked[collabName] = UNINITIALIZED;
    });
    forEach(testCollaborators.partialMocks, (partialMockConfig, collabName) => {
      shadowedPartialMocked[collabName] = UNINITIALIZED;
    });

    // return the instantiation of all requested collaboratorDescriptors with their tree of dependencies
    const collaboratorsAndDependencies = {};

    const realCollaborators = [ ...sutKeys, ...testCollaborators.reals ];
    reduce(realCollaborators, (accumulator, collaboratorName) => {
      const sutConfig = testCollaborators.sut[collaboratorName];

      // if real is the sut, we might also have assistedInjectionParams
      const assistedInjectionParams = sutConfig ? sutConfig.assistedInjectionParams : [];

      accumulator.collaboratorsAndDependencies[collaboratorName] = shadowedReal[collaboratorName] === UNINITIALIZED ?
        injector.getInstance.apply(injector, [ collaboratorName, ...assistedInjectionParams ]) :
        shadowedReal[collaboratorName];
    }, {
      collaboratorsAndDependencies
    });

    reduce(shadowedPartialMocked, (accumulator, value, collaboratorName) => {
      if (shadowedPartialMocked[collaboratorName] === UNINITIALIZED) {
        const collabConfig = testCollaborators.partialMocks[collaboratorName];
        const partialMock = injector.getInstance.apply(injector, [
          collaboratorName,
          ...collabConfig.assistedInjectionParams
        ]);

        if (collabConfig && collabConfig.customizer) {
          collabConfig.customizer(collaboratorName, partialMock);
        }

        accumulator.collaboratorsAndDependencies[collaboratorName] = partialMock;
      } else {
        accumulator.collaboratorsAndDependencies[collaboratorName] = shadowedPartialMocked[collaboratorName];
      }
    }, {
      collaboratorsAndDependencies
    });

    reduce(shadowedMocked, (accumulator, value, collaboratorName) => {
      if (shadowedMocked[collaboratorName] === UNINITIALIZED) {
        const mock = injector.getInstance(collaboratorName);

        const collabConfig = testCollaborators.mocks[collaboratorName];
        if (collabConfig && collabConfig.customizer) {
          collabConfig.customizer(collaboratorName, mock);
        }

        accumulator.collaboratorsAndDependencies[collaboratorName] = mock;
      } else {
        accumulator.collaboratorsAndDependencies[collaboratorName] = shadowedMocked[collaboratorName];
      }
    }, {
      collaboratorsAndDependencies
    });

    // return only the requested collaborators in the order they were requested
    return map(testCollaborators.collaboratorNames, (name) => collaboratorsAndDependencies[name]);
  };

  /**
   * @returns {Object.<String,*>} context object
   * @public
   */
  Injector.prototype.getInjectorContext = () => {
    if (testCaseContext === null) {
      throw new Error("An injector context is available only when a test is running");
    }
    return testCaseContext;
  };

  /**
   * Configures {@link injector#collaborators} to return a mock for injectableName.
   *
   * @param {String} injectableName name of the injectable that you want the injector to mock
   * @param {?function(injectableName:String,mockObj:td.DoubledObject<*>,context:Object<String,*>)} customizer
   * optional callback that gets called with the mockObj created to mimic injectableName's injectable.  You may
   * further customize mockObj with the
   * {@link https://github.com/testdouble/testdouble.js#tdwhen-for-stubbing-responses td.when} API in the customizer.
   * context is an object created for each test case that is passed to the customizer functions and that can be
   * used to share state between the test and mocks.
   * @returns {MockCollaborator} the configuration for a mock that can be passed to {@link Injector#collaborators}
   * @public
   */
  Injector.prototype.mockConfig = (injectableName, customizer) => {
    const context = this.getInjectorContext();
    if (customizer) {
      return new MockCollaborator(injectableName, (mockObj) => {
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
  Injector.prototype.partialMock = (injectableName, customizer) => {
    const args = Array.from(arguments);

    if (args.length > 1 && !isFunction(customizer)) {
      throw new Error(`partialMock: for injectableName ${injectableName} customizer passed was not a function`);
    }

    const assistedInjectionParams = (args.length > 2) ? args.slice(2) : [];

    if (customizer) {
      const context = this.getInjectorContext();
      return new PartialMockCollaborator(injectableName, assistedInjectionParams, (mockObj) => {
        customizer(injectableName, mockObj, context);
      });
    }

    return new PartialMockCollaborator(injectableName, assistedInjectionParams);
  };

  Injector.prototype.systemUnderTest = (injectableName) => {
    const assistedInjectionParams = Array.from(arguments).slice(1);

    return new SystemUnderTest(injectableName, assistedInjectionParams);
  }

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
});

module.exports = sociableInjector;

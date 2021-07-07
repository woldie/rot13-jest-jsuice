/* eslint-disable no-bitwise,prefer-rest-params,no-param-reassign,prefer-spread,no-underscore-dangle */
// noinspection JSBitwiseOperatorUsage

const td = require('testdouble');
const forEach = require('lodash.foreach');
const reduce = require('lodash.reduce');
const union = require('lodash.union');
const keys = require('lodash.keys');
const isFunction = require('lodash.isfunction');
const isUndefined = require('lodash.isundefined');
const isArray = require('lodash.isarray');
const map = require('lodash.map');
const has = require('lodash.has');
const classInfo = require('class-info');
const injector = require('../jsuice');
const Scope = require('../jsuice/lib/Scope');
const InjectableType = require('../jsuice/lib/InjectableType');

/**
 * @typedef {(String | [ String, ?function(partialMock: td.DoubledObject<any>) ])} PartialMockConfig
 */

/**
 * @typedef {{ MOCK: Array.<String>=, PARTIAL_MOCK: Array.<PartialMockConfig>=, REAL: Array.<String>=, SUT: String }} CollaboratorConfig
 */

let collaboratorSetupCalled = false;

const sociableInjector = injector.extend((Injector, injectableMetadata, dependencyGraph) => {
  const realGetInstanceForInjectable = Injector.prototype.getInstanceForInjectable;

  let shadowedMocked = {};
  let shadowedPartialMocked = {};
  let shadowedReal = {};
  let partialMockFactories = {};

  /**
   *
   * @param {Object} instanceTracker
   * @param {Injectable} injectable
   * @returns {Array}
   */
  function findOrCreateInstanceContainerForInjectable(instanceTracker, injectable) {
    const container = (instanceTracker[injectable.name] === true) ? [] : instanceTracker[injectable.name];

    instanceTracker[injectable.name] = container;

    return container;
  }

  /**
   *
   * @param injectable injectable
   * @param container instance container for injectable
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

  Object.assign(Injector.prototype, {
    getInstanceForInjectable(injectable) {
      if (!collaboratorSetupCalled) {
        throw new Error('Call injector.collaboratorSetup before trying to construct instances with the injector');
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

        const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);
        if (metaObj.numberOfUserSuppliedArgs > 0) {
          throw new Error(`Assisted injection not yet supported in sociable-jsuice tests, ${
            injectable.name} was the requested injectable.`);
        }

        if (!isSpyClass(injectable.subject)) {
          td.replace(injectable, 'subject', spyClass(injectable.subject));
        }

        // call through to the real injector as if subject on injectable were a normal class where all the members are
        // now spies
        const instance = realGetInstanceForInjectable.call(injector, injectable);
        container.push(instance);
        return instance;
      }

      if (has(shadowedReal, injectable.name)) {
        const container = findOrCreateInstanceContainerForInjectable(shadowedReal, injectable);
        if (isSingletonAllocatedInInjectableContainer(injectable, container)) {
          return container[0];
        }

        const instance = realGetInstanceForInjectable.call(injector, injectable);
        container.push(instance);
        return instance;
      }

      throw new Error(`sociable-jsuice got request for an injectable, ${
        injectable.name}, that was not listed in injector.collaboratorSetup nor a dependency thereof.`);
    },

    /**
     * This function is our chance to discover what objects need to be shadowed for the current test.
     * object
     * @name Injector#collaboratorSetup
     * @param {CollaboratorConfig} config
     * @returns {Object<String, *>}
     * @public
     */
    collaboratorSetup(config) {
      collaboratorSetupCalled = true;

      config = {
        SUT: config.SUT,
        REAL: config.REAL || [],
        MOCK: config.MOCK || [],
        PARTIAL_MOCK: config.PARTIAL_MOCK || []
      }

      // TODO validate collaboratorConfig for business rules/gigo (names shouldn't appear in multiple places, etc)

      shadowedPartialMocked = {};
      shadowedMocked = {};
      shadowedReal = {};
      partialMockFactories = {};

      shadowedReal[config.SUT] = true;
      forEach(config.REAL, realCollab => {
        shadowedReal[realCollab] = true;
      });
      forEach(config.MOCK, mockCollab => {
        shadowedMocked[mockCollab] = true;
      });
      forEach(config.PARTIAL_MOCK, partialMockConfig => {
        let partialMockCollab;
        if (isArray(partialMockConfig)) {
          const [ collaboratorName, partialMockFactoryFtn ] = partialMockConfig;

          partialMockCollab = collaboratorName;
          if (isFunction(partialMockFactoryFtn)) {
            partialMockFactories[partialMockCollab] = partialMockFactoryFtn;
          }
        } else {
          partialMockCollab = partialMockConfig;
        }


        shadowedPartialMocked[partialMockCollab] = true;
      });

      // Search all injectables and collect those marked as BOUNDARY injectables
      const boundaryInjectableNames = map(injector.injectableSearch(injectable => {
        const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);

        return metaObj && metaObj.flags && (metaObj.flags & injector.Flags.BOUNDARY);
      }), injectable => injectable.name);

      // find all the dependent ancestors of all real and partially mocked injectables not already in lists.  Add
      // boundary objects to the mocks list and everything else to the real list.
      forEach(union(keys(shadowedReal), keys(shadowedPartialMocked)), name => {
        forEach(dependencyGraph.getAllDependentAncestors(name), dependentName => {
          if (isUndefined(shadowedReal[dependentName]) && isUndefined(shadowedPartialMocked[dependentName]) &&
            isUndefined(shadowedMocked[dependentName])) {
            if (boundaryInjectableNames.indexOf(dependentName) <= 0) {
              shadowedReal[dependentName] = true;
            } else {
              shadowedMocked[dependentName] = true;
            }
          }
        });
      });

      // return the instantiation of all known singleton with their tree of dependencies
      const collaboratorsAndDependencies = {};
      reduce(union(keys(shadowedReal), keys(shadowedPartialMocked), keys(shadowedMocked)),
        (accumulator, collaboratorName) => {
          accumulator.collaboratorsAndDependencies[collaboratorName] = injector.getInstance(collaboratorName);
        },
        {
          collaboratorsAndDependencies
        });

      return collaboratorsAndDependencies;
    }
  });

  beforeEach(() => {
    collaboratorSetupCalled = false;
  });

  afterEach(() => {
    td.reset();

    injector.clearScope(Scope.SINGLETON);
    injector.clearScope(Scope.APPLICATION);

    shadowedReal = {};
    shadowedPartialMocked = {};

    // TODO: reset mocks and put them into a pool rather than clearing the map and allowing them to garbage collect here

    shadowedMocked = {};
  });
});

module.exports = sociableInjector;

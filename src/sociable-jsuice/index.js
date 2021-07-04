/* eslint-disable no-bitwise,prefer-rest-params,no-param-reassign */
// noinspection JSBitwiseOperatorUsage

const td = require('testdouble');
const forEach = require('lodash.foreach');
const flatten = require('lodash.flatten');
const union = require('lodash.union');
const keys = require('lodash.keys');
const injector = require('../jsuice');
const Scope = require('../jsuice/lib/Scope');
const InjectableType = require('../jsuice/lib/InjectableType');

/**
 * @typedef {{ MOCK: Array.<String>=, REAL: Array.<String>=, SUT: String }} CollaboratorConfig
 */

let collaboratorSetupCalled = false;
let sociableInjector = null;

injector.extend((Injector, injectableMetadata, dependencyGraph) => {
  const realGetInstanceForInjectable = Injector.prototype.getInstanceForInjectable;

  let shadowedInjectablesMocked = {};
  let shadowedInjectablesReal = {};

  sociableInjector = Object.assign(Injector.prototype, {
    getInstanceForInjectable(injectable) {
      if (!collaboratorSetupCalled) {
        throw new Error('Call injector.collaboratorSetup before trying to construct instances with the injector');
      }

      if (shadowedInjectablesMocked[injectable.name]) {
        const container = (shadowedInjectablesMocked[injectable.name] === true) ?
          [] :
          shadowedInjectablesMocked[injectable.name];

        shadowedInjectablesMocked[injectable.name] = container;
        if (injectable.scope === Scope.SINGLETON && container.length > 0) {
          return container[0];
        }

        const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);
        if (metaObj.numberOfUserSuppliedArgs > 0) {
          throw new Error("Assisted injection not yet supported in sociable-jsuice tests");
        }

        const instance = injectable.type === InjectableType.INJECTED_CONSTRUCTOR ?
          td.instance(injectable.subject) :
          td.object();
        container.push(instance);
        return instance;
      }

      if (shadowedInjectablesReal[injectable.name]) {
        const container = (shadowedInjectablesReal[injectable.name] === true) ?
          [] :
          shadowedInjectablesReal[injectable.name];

        shadowedInjectablesReal[injectable.name] = container;
        if (injectable.scope === Scope.SINGLETON && container.length > 0) {
          return container[0];
        }

        const instance = realGetInstanceForInjectable.apply(injector, Array.from(arguments));
        container.push(instance);
        return instance;
      }

      return realGetInstanceForInjectable.apply(injector, Array.from(arguments));
    },

    /**
     * This function is our chance to discover what objects need to be shadowed for the current test.
     *
     * @name Injector#collaboratorSetup
     * @param {CollaboratorConfig} config
     * @returns {Object<String, *>}
     * @public
     */
    collaboratorSetup(config) {
      collaboratorSetupCalled = true;

      // TODO validate collaboratorConfig for business rules/gigo (names shouldn't appear in multiple places, etc)
      config = {
        SUT: config.SUT,
        REAL: config.REAL || [],
        MOCK: config.MOCK || []
      }

      shadowedInjectablesMocked = {};
      shadowedInjectablesReal = {};

      shadowedInjectablesReal[config.SUT] = true;
      forEach(config.REAL, realCollab => {
        shadowedInjectablesReal[realCollab] = true;
      });
      forEach(config.MOCK, mockCollab => {
        shadowedInjectablesMocked[mockCollab] = true;
      });

      // find all the Injectables marked as BOUNDARY objects not already added to REAL, and add them to MOCK
      forEach(injector.injectableSearch(injectable => {
        const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);

        return metaObj && metaObj.flags && (metaObj.flags & injector.Flags.BOUNDARY);
      }), injectable => {
        // if the injectable wasn't previously added to the real map, then add it to the mock map
        if (shadowedInjectablesReal[injectable.name] !== true) {
          shadowedInjectablesMocked[injectable.name] = true;
        }
      });

      // find all the dependent ancestors of MOCK not in shadowedInjectablesMocked and add them to the real map
      forEach(union(keys(shadowedInjectablesMocked), keys(shadowedInjectablesReal)), name => {
        forEach(dependencyGraph.getAllDependentAncestors(name), dependentName => {
          if (!(shadowedInjectablesMocked[dependentName] || shadowedInjectablesReal[dependentName])) {
            shadowedInjectablesReal[dependentName] = true;
          }
        });
      });

      const collaborators = {};
      forEach(flatten([config.SUT, config.REAL, config.MOCK]), collaboratorName => {
        collaborators[collaboratorName] = injector.getInstance(collaboratorName);
      });

      return collaborators;
    }
  });

  beforeEach(() => {
    collaboratorSetupCalled = false;
  });

  afterEach(() => {
    shadowedInjectablesReal = {};

    // TODO: reset mocks and put them into a pool rather than allowing them to garbage collect here

    shadowedInjectablesMocked = {};
  });
});

module.exports = sociableInjector;

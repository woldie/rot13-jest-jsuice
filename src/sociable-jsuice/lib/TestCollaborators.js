/* eslint-disable no-unused-vars,max-classes-per-file,no-bitwise,prefer-destructuring */
// noinspection JSBitwiseOperatorUsage

const forEach = require('lodash.foreach');
const has = require('lodash.has');
const map = require('lodash.map');
const keys = require('lodash.keys');
const flatten = require('lodash.flatten');
const isString = require('lodash.isstring');
const isObject = require('lodash.isobject');
const isFunction = require('lodash.isfunction');

const SystemUnderTest = require('./SystemUnderTest');
const PartialMockCollaborator = require('./PartialMockCollaborator');
const MockCollaborator = require('./MockCollaborator');

/**
 * @ignore
 */
class TestCollaborators {
  /**
   * @param {Object.<String,SystemUnderTest>} sut
   * @param {Array.<String>} reals
   * @param {Object.<String,MockCollaborator>} mocks
   * @param {Object.<String,PartialMockCollaborator>} partialMocks
   * @param {Array.<String>} collaboratorNames
   * @param {Object.<String,FactoryFunction>} factoryFunctions
   */
  constructor(sut, reals, mocks, partialMocks, collaboratorNames, factoryFunctions) {
    /**
     * @name TestCollaborators#sut
     * @type {Object.<String,SystemUnderTest>}
     */
    this.sut = sut;

    /**
     * @name TestCollaborators#reals
     * @type {Array.<String>}
     */
    this.reals = reals;

    /**
     * @name TestCollaborators#mocks
     * @type {Object.<String,MockCollaborator>}
     */
    this.mocks = mocks;

    /**
     * @name TestCollaborators#partialMocks
     * @type {Object.<String,PartialMockCollaborator>}
     */
    this.partialMocks = partialMocks;

    /**
     * @name TestCollaborators#collaboratorNames
     * @type {Array.<String>}
     */
    this.collaboratorNames = collaboratorNames;

    /**
     * @name TestCollaborators#factoryFunctions
     * @type {Object.<String, FactoryFunction>}
     */
    this.factoryFunctions = factoryFunctions;
  }

  /**
   * @param {Injector} injector
   * @param {InjectableMetadata} injectableMetadata
   * @param {DependencyGraph} dependencyGraph
   * @param {Array.<Collaborator>} collaboratorDescriptors
   * @returns {TestCollaborators}
   */
  static create(injector, injectableMetadata, dependencyGraph, collaboratorDescriptors) {
    const uncategorizedCollaborators = [];
    const collaboratorNames = [];

    function validateNameNotAlreadyUsed(name) {
      if (collaboratorNames.indexOf(name) >= 0) {
        throw new Error(`Collaborator name appears in configuration more than once: ${name}`);
      }
    }

    const sut = [];
    const reals = [];
    const mocks = {};
    const partialMocks = {};
    const factoryFunctions = {};

    forEach(collaboratorDescriptors, collaborator => {
      if (isString(collaborator)) {
        validateNameNotAlreadyUsed(collaborator);
        uncategorizedCollaborators.push(collaborator);
        collaboratorNames.push(collaborator);
      } else if (isFunction(collaborator) && injector.isFactoryFunction.has(collaborator)) {
        const factoryFunctionInjectableName = injector.isFactoryFunction.get(collaborator);
        validateNameNotAlreadyUsed(factoryFunctionInjectableName)
        partialMocks[factoryFunctionInjectableName] = `${factoryFunctionInjectableName} factory function`;
        collaboratorNames.push(factoryFunctionInjectableName);
        factoryFunctions[factoryFunctionInjectableName] = collaborator;
      } else if (isObject(collaborator)) {
        if (collaborator instanceof MockCollaborator) {
          validateNameNotAlreadyUsed(collaborator.injectableName);
          mocks[collaborator.injectableName] = collaborator;
          collaboratorNames.push(collaborator.injectableName);
        } else if (collaborator instanceof PartialMockCollaborator) {
          validateNameNotAlreadyUsed(collaborator.injectableName);
          partialMocks[collaborator.injectableName] = collaborator;
          collaboratorNames.push(collaborator.injectableName);
        } else if (collaborator instanceof SystemUnderTest) {
          validateNameNotAlreadyUsed(collaborator.injectableName);
          sut.push(collaborator);
          reals.push(collaborator.injectableName);
          collaboratorNames.push(collaborator.injectableName);
        } else {
          throw new Error(`Unknown collaborator type: ${collaborator}`);
        }
      } else {
        throw new Error(`Unknown collaborator type: ${collaborator}`);
      }
    });

    // Search all injectables and collect those marked as INFRASTRUCTURE injectables
    const infrastructureInjectableNames = map(injector.injectableSearch(injectable => {
      const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);

      return metaObj && metaObj.flags && (metaObj.flags & injector.Flags.INFRASTRUCTURE);
    }), injectable => injectable.name);

    function addUncategorizedCollaboratorToLists(collaboratorName) {
      const uncatIndex = uncategorizedCollaborators.indexOf(collaboratorName);
      if (uncatIndex >= 0) {
        uncategorizedCollaborators.splice(uncatIndex, 1);
      }

      if (infrastructureInjectableNames.indexOf(collaboratorName) < 0) {
        if (reals.indexOf(collaboratorName) < 0) {
          reals.push(collaboratorName);
          addRealCollaboratorDependenciesToLists(collaboratorName);
        }
      } else if (!has(mocks, collaboratorName)) {
        mocks[collaboratorName] = new MockCollaborator(collaboratorName);
      }
    }

    function addRealCollaboratorDependenciesToLists(real) {
      forEach(dependencyGraph.getAllDependenciesAndDescendants(real), dependencyVertex => {
        const collaboratorName = dependencyVertex.name;
        addUncategorizedCollaboratorToLists(collaboratorName);
      });
    }

    // find all the dependent ancestors of the SUT and partially mocked injectables.  Add
    // infrastructure injectables to the mocks list and everything else to the real list.
    forEach(flatten([map(sut, obj => obj.injectableName), keys(partialMocks)]), name => {
      addRealCollaboratorDependenciesToLists(name);
    });

    // for the rest of the uncategorized collaboratorDescriptors requested by the caller, just add them to lists as
    // reals, we never figured out who they belonged to, but the caller asked for them so we might as well deliver
    forEach(uncategorizedCollaborators, name => {
      addRealCollaboratorDependenciesToLists(name);
    })

    if (sut.length > 1) {
      throw new Error(`Multiple SUT were specified, exactly one SUT must be specified per test case: ${sut}`);
    }
    if (!sut.length) {
      throw new Error('No SUT was specified, exactly one SUT must be specified per test case');
    }

    const sutObj = {};
    sutObj[sut[0].injectableName] = sut[0];

    return new TestCollaborators(sutObj, reals, mocks, partialMocks, collaboratorNames, factoryFunctions);
  }
}

module.exports = TestCollaborators;

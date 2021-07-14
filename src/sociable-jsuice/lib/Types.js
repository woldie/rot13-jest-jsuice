/* eslint-disable no-unused-vars,max-classes-per-file,no-bitwise */
// noinspection JSBitwiseOperatorUsage

const td = require('testdouble');
const forEach = require('lodash.foreach');
const has = require('lodash.has');
const map = require('lodash.map');
const keys = require('lodash.keys');
const flatten = require('lodash.flatten');
const isString = require('lodash.isstring');
const isObject = require('lodash.isobject');
const isUndefined = require('lodash.isundefined');

class SystemUnderTest {
  /**
   * @param {String} injectableName
   * @package
   */
  constructor(injectableName) {
    /**
     * @name SystemUnderTest#injectableName
     * @type {String}
     */
    this.injectableName = injectableName;
  }
}

/**
 * @typedef {?function(mock:td.DoubledObject<*>)} MockCustomizerCallback
 * @package
 */

class MockCollaborator {
  /**
   * @param {String} injectableName
   * @param {MockCustomizerCallback=} customizer
   * @package
   */
  constructor(injectableName, customizer) {
    /**
     * @name MockCollaborator#injectableName
     * @type {String}
     * @package
     */
    this.injectableName = injectableName;

    /**
     * @name MockCollaborator#customizer
     * @type {(MockCustomizerCallback|undefined)}
     * @package
     */
    this.customizer = customizer;
  }
}

class PartialMockCollaborator {
  /**
   * @param {String} injectableName
   * @param {MockCustomizerCallback=} customizer
   * @package
   */
  constructor(injectableName, customizer) {
    /**
     * @name PartialMockCollaborator#injectableName
     * @type {String}
     * @package
     */
    this.injectableName = injectableName;

    /**
     * @name PartialMockCollaborator#customizer
     * @type {(MockCustomizerCallback|undefined)}
     * @package
     */
    this.customizer = customizer;
  }
}

/**
 * @typedef {(SystemUnderTest|String|MockCollaborator|PartialMockCollaborator)} Collaborator
 */

/**
 * @ignore
 */
class TestCollaborators {
  /**
   * @param {String} sut
   * @param {Array.<String>} reals
   * @param {Object.<String,MockCollaborator>} mocks
   * @param {Object.<String,PartialMockCollaborator>} partialMocks
   * @param {Array.<String>} collaboratorNames
   */
  constructor(sut, reals, mocks, partialMocks, collaboratorNames) {
    /**
     * @name TestCollaborators#sut
     * @type {String}
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

    forEach(collaboratorDescriptors, collaborator => {
      if (isString(collaborator)) {
        validateNameNotAlreadyUsed(collaborator);
        uncategorizedCollaborators.push(collaborator);
        collaboratorNames.push(collaborator);
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
          sut.push(collaborator.injectableName);
          reals.push(collaborator.injectableName);
          collaboratorNames.push(collaborator.injectableName);
        } else {
          throw new Error(`Unknown collaborator type: ${collaborator}`);
        }
      } else {
        throw new Error(`Unknown collaborator type: ${collaborator}`);
      }
    });

    // Search all injectables and collect those marked as BOUNDARY injectables
    const boundaryInjectableNames = map(injector.injectableSearch(injectable => {
      const metaObj = injectableMetadata.findOrAddMetadataFor(injectable.subject);

      return metaObj && metaObj.flags && (metaObj.flags & injector.Flags.BOUNDARY);
    }), injectable => injectable.name);

    function addUncategorizedCollaboratorToLists(collaboratorName) {
      const uncatIndex = uncategorizedCollaborators.indexOf(collaboratorName);
      if (uncatIndex >= 0) {
        uncategorizedCollaborators.splice(uncatIndex, 1);
      }

      if (boundaryInjectableNames.indexOf(collaboratorName) < 0) {
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
    // boundary objects to the mocks list and everything else to the real list.
    forEach(flatten([sut, keys(partialMocks)]), name => {
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

    return new TestCollaborators(sut[0], reals, mocks, partialMocks, collaboratorNames);
  }
}

module.exports = { MockCollaborator, PartialMockCollaborator, TestCollaborators };

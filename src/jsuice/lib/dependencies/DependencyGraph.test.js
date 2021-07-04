/* eslint-disable no-underscore-dangle */
const DependencyGraph = require('./DependencyGraph');
const VertexType = require('./VertexType');
const EdgeLabel = require('./EdgeLabel');

describe('DependencyGraph', () => {
  /**
   * @type {DependencyGraph}
   */
  let dependencyGraph;

  beforeEach(() => {
    dependencyGraph = new DependencyGraph();
  });

  describe('associateInjectableWithModuleGroup', () => {
    it('will associate an injectable with the module group', () => {
      // GIVEN: a fake injectable
      const targetInjectable = /** @type {Injectable} */ { name: 'myInjectable' };

      // WHEN: I call associateInjectableWithModuleGroup
      const association = dependencyGraph.associateInjectableWithModuleGroup(targetInjectable, 'myModuleGroup');

      // THEN: the association contains expected values
      expect(association.moduleGroup).toEqual(expect.objectContaining({
        name: 'myModuleGroup',
        type: VertexType.MODULE_GROUP
      }));
      expect(association.moduleGroup._id).toBeGreaterThan(0);
      expect(association.injectable).toEqual(expect.objectContaining({
        name: 'myInjectable',
        injectable: targetInjectable,
        type: VertexType.INJECTABLE
      }));
      expect(association.injectable._id).toBeGreaterThan(0);
      expect(association.edge).toEqual(expect.objectContaining({
        _out: association.moduleGroup,
        _in: association.injectable,
        _label: EdgeLabel.GROUP_MEMBER
      }));

      // WHEN: I try to associate again
      const redundantAssociation = dependencyGraph.associateInjectableWithModuleGroup(targetInjectable, 'myModuleGroup');

      // THEN: I should get the same objects back rather than new ones getting added to the graph
      expect(redundantAssociation.edge).toStrictEqual(association.edge);
      expect(redundantAssociation.injectable).toStrictEqual(association.injectable);
      expect(redundantAssociation.moduleGroup).toStrictEqual(association.moduleGroup);
    });
  });

  describe('associateConstructionParameterWithInjectable', () => {
    it('will build associations in the graph', () => {
      // GIVEN: a fake injectable
      const sourceInjectable = /** @type {Injectable} */ { name: 'myInjectable' };

      // WHEN: I call associateConstructionParameterWithInjectable
      const association = dependencyGraph.associateConstructionParameterWithInjectable(sourceInjectable, 'parameterA');

      // THEN: the association contains expected values
      expect(association.injectable).toEqual(expect.objectContaining({
        name: 'myInjectable',
        injectable: sourceInjectable,
        type: VertexType.INJECTABLE
      }));
      expect(association.injectable._id).toBeGreaterThan(0);
      expect(association.parameter).toEqual(expect.objectContaining({
        name: 'parameterA',
        type: VertexType.INJECTABLE
      }));
      expect(association.parameter._id).toBeGreaterThan(0);
      expect(association.edge).toEqual(expect.objectContaining({
        _out: association.injectable,
        _in: association.parameter,
        _label: EdgeLabel.INJECTABLE_PARAM
      }));

      // AND: the parameter dependency's Injectable was not yet registered with the graph, so that will be undefined
      expect(association.parameter.injectable).toBeUndefined()

      // WHEN: I try to associate again
      const redundantAssociation = dependencyGraph.associateConstructionParameterWithInjectable(sourceInjectable, 'parameterA');

      // THEN: I should get the same objects back rather than new ones getting added to the graph
      expect(redundantAssociation.edge).toStrictEqual(association.edge);
      expect(redundantAssociation.injectable).toStrictEqual(association.injectable);
      expect(redundantAssociation.parameter).toStrictEqual(association.parameter);

      // GIVEN: another fake injectable for the parameter dependency
      const parameterInjectable = /** @type {Injectable} */ { name: 'parameterA' };

      // WHEN: I register the parameter in the graph
      const parameterVertex = dependencyGraph.findOrCreateInjectableVertex('parameterA', parameterInjectable);

      // THEN: the parameterVertex is the same vertex that appears as the 'in' side of the association edge we established above
      expect(association.edge._in).toStrictEqual(parameterVertex);

      // AND: that vertex returned has the injectable assigned rather than being undefined
      expect(parameterVertex.injectable).toStrictEqual(parameterInjectable);
    });
  });

  // describe('getAllDependentAncestors', () => {
  //   it('will get all the ancestors of ')
  // });
});

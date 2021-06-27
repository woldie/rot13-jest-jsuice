/* eslint-disable no-underscore-dangle */
const DependencyGraph = require('./DependencyGraph');
const VertexType = require('./VertexType');
const EdgeLabel = require('./EdgeLabel');

describe('DependencyGraph', () => {
  let dependencyGraph;

  beforeEach(() => {
    dependencyGraph = new DependencyGraph();
  });

  describe('associateInjectableWithModuleGroup', () => {
    it('will set the subject in the weak map', () => {
      // GIVEN: a fake injectable
      const injectable = /** @type {Injectable} */ { name: 'myInjectable' };

      // WHEN: I call associateInjectableWithModuleGroup
      const association = dependencyGraph.associateInjectableWithModuleGroup(injectable, 'myModuleGroup');

      // THEN: the association contains expected values
      expect(association.moduleGroup).toEqual(expect.objectContaining({
        name: 'myModuleGroup',
        type: VertexType.MODULE_GROUP
      }));
      expect(association.moduleGroup._id).toBeGreaterThan(0);
      expect(association.injectable).toEqual(expect.objectContaining({
        name: 'myInjectable',
        type: VertexType.INJECTABLE
      }));
      expect(association.injectable._id).toBeGreaterThan(0);
      expect(association.edge).toEqual(expect.objectContaining({
        _out: association.moduleGroup,
        _in: association.injectable,
        _label: EdgeLabel.GROUP_MEMBER
      }));

      // WHEN: if I ever associate again
      const redundantAssociation = dependencyGraph.associateInjectableWithModuleGroup(injectable, 'myModuleGroup');

      // THEN: I should get the same objects back
      expect(redundantAssociation.edge).toStrictEqual(association.edge);
      expect(redundantAssociation.injectable).toStrictEqual(association.injectable);
      expect(redundantAssociation.moduleGroup).toStrictEqual(association.moduleGroup);
    });
  });
});

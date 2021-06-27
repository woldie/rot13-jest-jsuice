/* eslint-disable no-underscore-dangle,no-unused-vars */
const Dagoba = require('../dagoba/dagoba');
const VertexType = require('./VertexType');
const EdgeLabel = require('./EdgeLabel');

/**
 * @typedef {(Function|Object)} SubjectKey
 */

/**
 * @typedef {{ name: String, type: VertexType, _id: *= }} GraphVertex
 */

/**
 * @typedef {GraphVertex & { injectable: Injectable= }} InjectableVertex
 */

/**
 * @typedef {GraphVertex & { }} ModuleGroupVertex
 */

/**
 * @typedef {{ _out: *, _in: *, _label: String }} GraphEdge
 */

/**
 * @typedef {{ moduleGroup: ModuleGroupVertex, injectable: InjectableVertex, edge: GraphEdge }} GroupInjectableAssoc
 */

/**
 * @typedef {{ injectable: InjectableVertex, parameter: InjectableVertex, edge: GraphEdge }} InjectableParamAssoc
 */

/**
 * @typedef {{ name: String, vertexId: number }} SubjectInfo
 */

/**
 * @classDesc Dependency Graph that tracks interrlationships in J'Suice.
 */
class DependencyGraph {
  constructor() {
    /**
     * @name DependencyGraph#db
     * @type {Dagoba}
     */
    this.db = Dagoba.graph();
  }

  /**
   * @param {GraphVertex} graphVertex
   * @returns {GraphVertex}
   * @private
   */
  findOrCreateVertexBySearchQuery(graphVertex) {
    const vertices = /** @type {GraphVertex[]} */ this.db.searchVertices(graphVertex);
    if (!vertices.length) {
      this.db.addVertex(graphVertex);

      return this.findOrCreateVertexBySearchQuery(graphVertex);
    }

    return vertices[0];
  }

  /**
   * @param {String} name injectable name
   * @param {Injectable=} injectable injectable (can be undefined if you don't have it)
   * @returns {InjectableVertex} injectable vertex in the graph
   * @package
   * @ignore
   */
  findOrCreateInjectableVertex(name, injectable) {
    const injectableVertex = /** @type {InjectableVertex} */ this.findOrCreateVertexBySearchQuery({
      type: VertexType.INJECTABLE,
      name
    });

    if (injectable) {
      injectableVertex.injectable = injectable;
    }
    return injectableVertex;
  }

  /**
   * @param {String} name module group name
   * @returns {ModuleGroupVertex} module group vertex in the graph
   * @package
   * @ignore
   */
  findOrCreateModuleGroupVertex(name) {
    return /** @type {ModuleGroupVertex} */ this.findOrCreateVertexBySearchQuery({
      type: VertexType.MODULE_GROUP,
      name
    });
  }

  /**
   * @param {GraphVertex} outVertex
   * @param {GraphVertex} inVertex
   * @param {String} edgeLabel searchable name for the edge
   * @returns {GraphEdge} new or existing edge
   * @private
   */
  findOrAddEdgeBetwixtVertices(outVertex, inVertex, edgeLabel) {
    const edges = this.db.findOutEdges(outVertex)
      .filter(edge => edge._in._id === inVertex._id)
      .filter(edge => edge._label === edgeLabel);

    if (!edges.length) {
      this.db.addEdge({ _out: outVertex._id, _in: inVertex._id, _label: edgeLabel });
      return this.findOrAddEdgeBetwixtVertices(outVertex, inVertex, edgeLabel);
    }

    return edges[0];
  }

  /**
   * Build an association between an injectable and its name and build a vertex for the subject
   * @param {Injectable} injectable the injectable module
   * @param {String} moduleGroupName the name of the module group
   * @returns {GroupInjectableAssoc} association between injectable and group
   */
  associateInjectableWithModuleGroup(injectable, moduleGroupName) {
    const moduleGroupVertex = this.findOrCreateModuleGroupVertex(moduleGroupName);
    const injectableVertex = this.findOrCreateInjectableVertex(injectable.name, injectable);

    const associationEdge = this.findOrAddEdgeBetwixtVertices(
      moduleGroupVertex,
      injectableVertex,
      EdgeLabel.GROUP_MEMBER
    );

    return {
      injectable: injectableVertex,
      moduleGroup: moduleGroupVertex,
      edge: associationEdge
    };
  }

  /**
   * @param {String} paramName
   * @param {Injectable} injectable
   * @returns {InjectableParamAssoc}
   */
  associateConstructionParameterWithInjectable(paramName, injectable) {
    const paramVertex = this.findOrCreateInjectableVertex(paramName, null);
    const injectableVertex = this.findOrCreateInjectableVertex(injectable.name, injectable);

    const associationEdge = this.findOrAddEdgeBetwixtVertices(
      injectableVertex,
      paramVertex,
      EdgeLabel.INJECTABLE_PARAM
    );

    return {
      injectable: injectableVertex,
      parameter: paramVertex,
      edge: associationEdge
    };
  }
}

module.exports = DependencyGraph;

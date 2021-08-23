/* eslint-disable no-underscore-dangle,no-unused-vars */
const Dagoba = require('./dagoba/dagoba');
const VertexType = require('./VertexType');
const EdgeLabel = require('./EdgeLabel');

/**
 * @typedef {(Function|Object)} SubjectKey
 * @ignore
 */

/**
 * @typedef {{ name: String, type: VertexType, _id: *= }} GraphVertex
 * @ignore
 */

/**
 * @typedef {GraphVertex & { injectable: Injectable= }} InjectableVertex
 * @ignore
 */

/**
 * @typedef {GraphVertex & { }} ModuleGroupVertex
 * @ignore
 */

/**
 * @typedef {{ _out: *, _in: *, _label: String }} GraphEdge
 * @ignore
 */

/**
 * @typedef {{ moduleGroup: ModuleGroupVertex, injectable: InjectableVertex, edge: GraphEdge }} GroupInjectableAssoc
 * @ignore
 */

/**
 * @typedef {{ injectable: InjectableVertex, parameter: InjectableVertex, edge: GraphEdge }} InjectableParamAssoc
 * @ignore
 */

/**
 * @typedef {{ name: String, vertexId: number }} SubjectInfo
 * @ignore
 */

/**
 * @classDesc Dependency Graph that tracks interrelationships in J'Suice.
 * @ignore
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
   * @name DependencyGraph#findOrCreateVertexBySearchQuery
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
   * @name DependencyGraph#findOrCreateInjectableVertex
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
   * @name DependencyGraph#findOrCreateModuleGroupVertex
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
   * @name DependencyGraph#findOrAddEdgeBetwixtVertices
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
   * @name DependencyGraph#associateInjectableWithModuleGroup
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
   * @name DependencyGraph#associateConstructionParameterWithInjectable
   * @param {Injectable} injectable
   * @param {String} paramName
   * @returns {InjectableParamAssoc}
   */
  associateConstructionParameterWithInjectable(injectable, paramName) {
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

  /**
   * Find all Injectables that whichInjectable depends on and those Injectables' dependencies and so on...
   *
   * <p>whichInjectable and all its dependencies and descendants must a valid injectable that is already in the graph
   * when this method is called.
   *
   * @name DependencyGraph#getAllDependenciesAndDescendants
   * @param {String} whichInjectable Name of injectable for whom we will search for all dependencies and descendants
   * @returns {Array.<InjectableVertex>} vertexes of Injectables that are dependencies and descendants
   * @package
   */
  getAllDependenciesAndDescendants(whichInjectable) {
    const dependencies = /** @type {Array.<InjectableVertex>} */ [];

    const injectableVertex = /** @type {InjectableVertex} */ this.findOrCreateVertexBySearchQuery({
      type: VertexType.INJECTABLE,
      name: whichInjectable
    });

    this.recurseAllDependenciesAndDescendants(dependencies, injectableVertex);

    return dependencies;
  }

  /**
   * @name DependencyGraph#recurseAllDependenciesAndDescendants
   * @param {Array.<InjectableVertex>} dependencies
   * @param {InjectableVertex} vertex
   * @private
   */
  recurseAllDependenciesAndDescendants(dependencies, vertex) {
    if (!vertex.injectable) {
      throw new Error(`During dependency search, a required injectable named ${
        vertex.name} was not found in any module group.  See Injector#moduleGroup for more information.`);
    }

    // Find all the children that we've never seen before in the dependencies list
    const unvisitedDependencyVertices = this.db.v(vertex._id)
      .out(EdgeLabel.INJECTABLE_PARAM)
      .unique()
      .filter(vert => dependencies.indexOf(vert) < 0)
      .run();

    unvisitedDependencyVertices.forEach(dependencyVertex => {
      dependencies.push(dependencyVertex);
      this.recurseAllDependenciesAndDescendants(dependencies, dependencyVertex);
    });
  }
}

module.exports = DependencyGraph;

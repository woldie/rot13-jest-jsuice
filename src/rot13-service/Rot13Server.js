const injector = require('../jsuice');

const { Scope } = injector;

class Rot13Server {
  /**
   * @param {NodeServerFactory} nodeServerFactory
   */
  constructor(nodeServerFactory) {
    /**
     * @name Rot13Server#nodeServerFactory
     * @type {NodeServerFactory}
     */
    this.nodeServerFactory = nodeServerFactory;
  }

  async launch() {

  }
}

module.exports = injector.annotateConstructor(Rot13Server, Scope.SINGLETON, 'nodeServerFactory');

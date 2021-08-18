const http = require('http');

const injector = require('../../jsuice');

const { Flags, Scope } = injector;

class NodeServerFactory {
  /**
   * @returns {module:http.Server}
   */
  create() {
    return http.createServer();
  }
}

module.exports = injector.annotateConstructor(NodeServerFactory, Scope.SINGLETON + Flags.INFRASTRUCTURE);

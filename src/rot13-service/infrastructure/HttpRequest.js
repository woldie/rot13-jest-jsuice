const injector = require('../../jsuice')

class HttpRequest {
  /**
   * @param {module:http.IncomingMessage} nodeRequest
   */
  constructor(nodeRequest) {
    /**
     * @name HttpRequest#nodeRequest
     * @type {module:http.IncomingMessage}
     */
    this.nodeRequest = nodeRequest;
  }
}

injector.annotateConstructor(HttpRequest, injector.Scope.PROTOTYPE, 1);

module.exports = HttpRequest;

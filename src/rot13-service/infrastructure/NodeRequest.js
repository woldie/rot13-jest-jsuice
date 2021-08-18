const injector = require('../../jsuice');

const { Scope, Flags } = injector;

/**
 * Identity function that returns the nodeRequest passed from the caller.
 *
 * @param {module:http.IncomingMessage} nodeRequest low level NodeJS http request
 */
function providerFunction(nodeRequest) {
  return nodeRequest;
}

module.exports = injector.createProvider(providerFunction, Scope.PROTOTYPE + Flags.INFRASTRUCTURE, 1);

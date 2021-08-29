/* eslint-disable prefer-rest-params,no-unused-vars */
// const Log = require("infrastructure/log");

const { IncomingRequest, ServerResponse } = require('http');
const { signatureCheck, getTypeErrors } = require('../rot13-utils/typeCheck');

const injector = require('../jsuice');

const { Scope } = injector;
const RESPONSE_TYPE = { status: Number, headers: Object, body: String };

/** Wrapper for Node HTTP server */
class HttpServer {
  constructor(nodeServerFactory, httpRequestInstancer, logFactory) {
    /**
     * factory for Node Servers
     *
     * @name HttpServer#nodeServerFactory
     * @type {NodeServerFactory}
     */
    this.nodeServerFactory = nodeServerFactory;

    /**
     * @name HttpServer#nodeServer
     * @type {module:http.Server}
     */
    this.nodeServer = null;

    /**
     * @name HttpServer#httpRequestInstancer
     * @type {Instancer.<HttpRequest>}
     */
    this.httpRequestInstancer = httpRequestInstancer;

    /**
     * @name HttpServer#log
     * @type {pino.Logger}
     */
    this.log = logFactory.createLogger();
  }

  isStarted() {
    return this.nodeServer != null;
  }

  async start({ port, onRequestAsync }) {
    signatureCheck(arguments, [{ port: Number, onRequestAsync: Function }]);
    if (this.isStarted()) {
      throw new Error("Can't start server because it's already running");
    }
    this.nodeServer = this.nodeServerFactory.create();

    await new Promise((resolve, reject) => {
      this.nodeServer.on('error', err => {
        this.nodeServer = null;
        reject(new Error(`Couldn't start server due to error: ${err.message}`));
      });

      this.nodeServer.on('request', async (nodeRequest, nodeResponse) => {
        await this.dispatchRequest(nodeRequest, nodeResponse, onRequestAsync);
      });

      this.nodeServer.on('listening', () => {
        resolve();
      });

      this.nodeServer.listen(port);
    });
  }

  async stop() {
    signatureCheck(arguments, []);
    if (!this.isStarted()) {
      throw new Error("Can't stop server because it isn't running");
    }

    await new Promise(resolve => {
      this.nodeServer.on('close', () => {
        this.nodeServer = null;
        resolve();
      });

      this.nodeServer.close();
    });
  }

  /**
   *
   * @param {IncomingRequest} nodeRequest
   * @param {ServerResponse} nodeResponse
   * @param {function(httpRequest: HttpRequest)} onRequestAsync
   * @returns {Promise<void>}
   */
  async dispatchRequest(nodeRequest, nodeResponse, onRequestAsync) {
    const { status, headers, body } = await this.generateResponse(nodeRequest, onRequestAsync);
    nodeResponse.statusCode = status;
    Object.entries(headers).forEach(([ name, value ]) => nodeResponse.setHeader(name, value));
    nodeResponse.end(body);
  }

  /**
   *
   * @param {IncomingRequest} nodeRequest
   * @param {function(httpRequest: HttpRequest)} onRequestAsync
   * @returns {Promise<{headers: Object.<String,String>, body: String, status: Number}>}
   */
  async generateResponse(nodeRequest, onRequestAsync) {
    try {
      const httpRequest = this.httpRequestInstancer(nodeRequest);
      const response = await onRequestAsync(httpRequest);
      const typeError = getTypeErrors(response, RESPONSE_TYPE);
      if (typeError !== null) {
        this.log.fatal( { ...response }, 'request handler returned invalid response');
        return internalServerError();
      }
      return response;
    }
    catch (err) {
      this.log.fatal( { err }, 'request handler threw exception');
      return internalServerError();
    }
  }
}

function internalServerError() {
  return {
    status: 500,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'Internal Server Error',
  };
}

module.exports = injector.annotateConstructor(HttpServer, Scope.PROTOTYPE,
  'nodeServerFactory',
  injector.instancer('httpRequest'),
  'logFactory'
);

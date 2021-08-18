/* eslint-disable prefer-rest-params */
// const Log = require("infrastructure/log");
const { signatureCheck, getTypeErrors } = require('../rot13-utils/typeCheck');

const injector = require('../jsuice');

const { Scope } = injector;
const RESPONSE_TYPE = { status: Number, headers: Object, body: String };

/** Wrapper for Node HTTP server */
class HttpServer {
  constructor(nodeServerFactory, httpRequestInstancer) {
    /**
     * factory for Node Servers
     *
     * @name HttpServer#nodeServerFactory
     * @type {NodeServerFactory}
     */
    this.nodeServerFactory = nodeServerFactory;

    /**
     * Used to instance wrappers nodeRequest objects
     *
     * @name HttpServer#httpRequestInstancer
     * @type {Instancer<HttpRequest>}
     */
    this.httpRequestInstancer = httpRequestInstancer;

    /**
     * @name HttpServer#nodeServer
     * @type {module:http.Server}
     */
    this.nodeServer = null;
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
        reject(new Error(`Couldn't start server due to error: ${err.message}`));
      });

      this.nodeServer.on('request', async (nodeRequest, nodeResponse) => {
        await this.dispatchRequest(nodeRequest, nodeResponse, onRequestAsync);
      });

      this.nodeServer.on('listening', () => {
        this.nodeServer = null;
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

  async dispatchRequest(nodeRequest, nodeResponse, onRequestAsync) {
    const { status, headers, body } = await this.generateResponse(nodeRequest, onRequestAsync);
    nodeResponse.statusCode = status;
    Object.entries(headers).forEach(([ name, value ]) => nodeResponse.setHeader(name, value));
    nodeResponse.end(body);
  }

  async generateResponse(nodeRequest, onRequestAsync) {
    try {
      const response = await onRequestAsync(this.httpRequestInstancer(nodeRequest));
      const typeError = getTypeErrors(response, RESPONSE_TYPE);
      if (typeError !== null) {
        // log.emergency({ message: "request handler returned invalid response", response });
        return internalServerError();
      }
      return response;
    }
    catch (err) {
      // log.emergency({ message: "request handler threw exception", error: err });
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

//
// const nullHttp = {
//   createServer() {
//     return new NullNodeServer();
//   }
// };
//
// class NullNodeServer extends EventEmitter {
//   listen() {
//     setImmediate(() => this.emit("listening"));
//   }
//   close() {
//     setImmediate(() => this.emit("close"));
//   }
// }

module.exports = injector.annotateConstructor(HttpServer, Scope.PROTOTYPE,
  'nodeServerFactory',
  injector.instancer('httpRequest'));

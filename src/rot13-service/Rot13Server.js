/* eslint-disable prefer-rest-params,no-unused-vars */
const bind = require('lodash.bind');

const { signatureCheck }  = require('../rot13-utils/typeCheck');
const injector = require('../jsuice');
const HttpRequest = require('./HttpRequest');

const { Scope } = injector;

class Rot13Server {
  /**
   * @param {CommandLine} commandLine
   * @param {HttpServer} httpServer
   * @param {Rot13Router} rot13Router
   */
  constructor(commandLine, httpServer, rot13Router) {
    /**
     * @name Rot13Server#commandLine
     * @type {CommandLine}
     */
    this.commandLine = commandLine;

    /**
     * @name Rot13Server#httpServer
     * @type {HttpServer}
     */
    this.httpServer = httpServer;

    /**
     * @name Rot13Server#rot13Router
     * @type {Rot13Router}
     */
    this.rot13Router = rot13Router;
  }

  async launch() {
    signatureCheck(arguments, []);

    const args = this.commandLine.args();
    if (args.length !== 1) {
      this.commandLine.writeStderr(`Usage: serve PORT\n`);
      return;
    }

    const port = parseInt(args[0], 10);
    await this.httpServer.start({ port, onRequestAsync: bind(this.onRequestAsync, this) });
    await this.commandLine.writeStdout(`Server started on port ${port}\n`);
  }

  /**
   * @param {HttpRequest} httpRequest
   * @returns {Promise<{headers?: Object, body?: String, status: Number}>}
   */
  async onRequestAsync(httpRequest) {
    signatureCheck(arguments, [ HttpRequest ]);

    this.commandLine.writeStdout('Received request\n');
    return this.rot13Router.route(httpRequest);
  }
}

module.exports = injector.annotateConstructor(Rot13Server, Scope.SINGLETON, 'commandLine', 'httpServer', 'rot13Router');

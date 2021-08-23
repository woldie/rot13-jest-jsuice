const injector = require('../sociable-jsuice');

const PORT = 5001;

describe("HTTP Server", () => {
  let /** @type {Instancer.<HttpServer>} */ httpServerInstancer;

  let /** @type {HttpServer} */ httpServer;

  beforeEach(() => {
    [ httpServerInstancer ] = injector.collaborators(
      injector.systemUnderTestInstancer('httpServer')
    );

    httpServer = httpServerInstancer();
  });

  describe("starting and stopping", () => {


  });

  /**
   * @param {HttpServer} httpServer
   * @param onRequestAsync
   * @returns {Promise<void>}
   */
  async function startAsync(httpServer, {
    onRequestAsync = () => {},
  } = {}) {
    await httpServer.start({ port: PORT, onRequestAsync });
  }

  async function stopAsync(httpServer) {
    await httpServer.stop();
  }

  async function startAndStopAsync(httpServer, options, fnAsync) {
    await startAsync(httpServer, options);
    try {
      return await fnAsync();
    }
    finally {
      await stopAsync(httpServer);
    }
  }
});

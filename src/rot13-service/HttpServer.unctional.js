const injector = require('../sociable-jsuice');

const TEST_PORT = 5001;

describe("HTTP Server (functional)", () => {
  let /** @type {Instancer.<HttpServer>} */ httpServerInstancer;

  let /** @type {HttpServer} */ httpServer;

  beforeEach(() => {
    [ httpServerInstancer ] = injector.collaborators(
      injector.systemUnderTestInstancer('httpServer')
    );

    httpServer = httpServerInstancer();
  });

  describe("starting and stopping", () => {
    it("starts and stops server (and can do so multiple times)", async () => {
      await startAsync(httpServer);
      await stopAsync(httpServer);
      await startAsync(httpServer);
      await stopAsync(httpServer);
    });

    it('says if the server is started', async () => {
      expect(httpServer.isStarted(), 'before server started').toEqual(false);
      await startAsync(httpServer);
      expect(httpServer.isStarted(), 'after server started').toEqual(true);
      await stopAsync(httpServer);
      expect(httpServer.isStarted(), 'after server stopped').toEqual(false);
    });

    it('fails gracefully if server has startup error', async () => {
      await startAndStopAsync(httpServer, {}, async () => {
        expect.assertions(1);
        try {
          const otherHttpServer = httpServerInstancer();
          await startAsync(otherHttpServer);
        } catch (e) {
          expect(e.message).toMatch(/^Couldn't start server due to error:.*?EADDRINUSE/)
        }
      });
    });

  });

  /**
   * @param {HttpServer} httpServer
   * @param onRequestAsync
   * @returns {Promise<void>}
   */
  async function startAsync(httpServer, {
    onRequestAsync = () => {},
  } = {}) {
    await httpServer.start({ port: TEST_PORT, onRequestAsync });
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

const injector = require('../sociable-jsuice');
const testHelper = require('../rot13-test-utils/testHelper');

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

  describe('starting and stopping', () => {
    it('fails fast if server is started twice', async () => {
      await startAndStopAsync(httpServer, {}, async () => {
        expect.assertions(1);
        try {
          await startAsync(httpServer);
        } catch (e) {
          expect(e.message).toMatch(/Can't start server because it's already running/);
        }
      });
    });

    it("fails fast if server is stopped when it isn't running", async () => {
      expect.assertions(1);
      try {
        await stopAsync(httpServer);
      } catch (e) {
        expect(e.message).toMatch(/Can't stop server because it isn't running/);
      }
    });
  });

  describe("requests and responses", () => {

  });

});



async function getAsync(httpServer, { onRequestAsync }) {
  return startAndStopAsync(httpServer, { onRequestAsync }, async () => ({
    response: await testHelper.requestAsync({ port: PORT })
  }));
}

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

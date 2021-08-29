/* eslint-disable global-require */
const td = require('testdouble');
const injector = require('../sociable-jsuice');
const testHelper = require('../rot13-test-utils/testHelper');
const HttpRequest = require('./HttpRequest');

const TEST_PORT = 5001;

describe("HTTP Server (functional)", () => {
  let /** @type {Instancer.<HttpServer>} */ httpServerInstancer;

  let /** @type {HttpServer} */ httpServer;

  beforeEach(() => {
    [ httpServerInstancer ] = injector.collaborators(
      injector.systemUnderTestInstancer('httpServer'),
      injector.partialMock('logFactory', require('../rot13-utils/infrastructure/LogFactory.mock'))
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

  describe('requests and responses', () => {
    it("runs a function when a request is received and serves the result", async () => {
      const expectedResponse = {
        status: 777,
        headers: {
          header1: "value1",
          header2: "value2",
        },
        body: "my body",
      };
      function onRequestAsync() { return expectedResponse; }

      const { response } = await getAsync(httpServer, { onRequestAsync });
      expect(response).toEqual(expectedResponse);
    });

    it('provides request object to request handler', async () => {
      let actualRequest;
      function onRequestAsync(request) {
        actualRequest = request;
      }

      await getAsync(httpServer, { onRequestAsync });
      expect(actualRequest).toBeInstanceOf(HttpRequest);
    });

    it('fails gracefully when request handler throws exception', async () => {
      function onRequestAsync() { throw new Error('onRequestAsync error'); }

      const { response } = await getAsync(httpServer, { onRequestAsync });

      td.verify(httpServer.log.fatal(
        td.matchers.anything(),
        td.matchers.contains('request handler threw exception')
      ), { times: 1 });
      // assert.deepEqual(logOutput, [{
      //   alert: Log.EMERGENCY,
      //   message: "request handler threw exception",
      //   error: "Error: onRequestAsync error",
      // }]);
      // assert.deepEqual(response, {
      //   status: 500,
      //   headers: { "content-type": "text/plain; charset=utf-8" },
      //   body: "Internal Server Error",
      // });
    });

  });

});



async function getAsync(httpServer, { onRequestAsync }) {
  return startAndStopAsync(httpServer, { onRequestAsync }, async () => ({
    response: await testHelper.requestAsync({ port: TEST_PORT })
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

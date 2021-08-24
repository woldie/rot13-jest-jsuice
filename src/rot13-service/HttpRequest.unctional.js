const td = require('testdouble');
const { IncomingMessage } = require('http');
const testHelper = require('../rot13-test-utils/testHelper');
const injector = require('../sociable-jsuice');

const TEST_PORT = 5001;

describe('HttpRequest (functional)', () => {
  /** @type {HttpServer} */
  let httpServer;

  describe('raw data', () => {
    beforeEach(() => {
      // The system under test is the httpServer, because it and th
      [ httpServer ] = injector.collaborators(
        injector.systemUnderTest('httpServer')
      );
    });

    it('leverage the built in NodeRequest parsing of method (normalizes case)', async () => {
      expect.assertions(1);

      await requestAsync(httpServer, { method: 'poST', onRequestAsync(httpRequest) {
        expect(httpRequest.getMethod()).toEqual('POST');
      }});
    });
  });

  async function requestAsync(httpServer, { method, onRequestAsync }) {
    return startAndStopAsync(httpServer, { onRequestAsync }, async () => ({
      response: await testHelper.requestAsync({ method,  port: TEST_PORT })
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

});

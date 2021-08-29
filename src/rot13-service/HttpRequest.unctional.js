/* eslint-disable global-require */
const testHelper = require('../rot13-test-utils/testHelper');
const injector = require('../sociable-jsuice');

const TEST_PORT = 5002;

const DEFAULT_RESPONSE = { status: 200, headers: {}, body: '' };

describe('HttpRequest (functional)', () => {
  let /** @type {HttpServer} */ httpServer;

  beforeEach(() => {
    [ httpServer ] = injector.collaborators(
      // The system under test is the httpServer, because it is responsible for creating the underlying node request
      // that it needs to be instantiated
      injector.systemUnderTest('httpServer'),
      injector.partialMock('logFactory', require('../rot13-utils/infrastructure/LogFactory.mock'))
    );
  });


  describe('raw data', () => {
    it('leverage the built-in NodeRequest parsing of method (normalizes case)', async () => {
      let methodSubmitted;
      await requestAsync(httpServer, { method: 'poST', onRequestAsync(httpRequest) {
        methodSubmitted = httpRequest.getMethod();
        return DEFAULT_RESPONSE;
      }});

      expect(methodSubmitted).toEqual('POST');
    });

    it('leverage the built-in provides headers (and normalizes case)', async () => {
      const headers = {
        myHEADER1: 'myValue1',
        MYHeader2: 'myValue2',
      };

      let headersSubmitted;
      await createRequestAsync(httpServer, { headers }, request => {
        headersSubmitted = request.getHeaders();
        return DEFAULT_RESPONSE;
      });

      expect(headersSubmitted).toEqual( {
        connection: 'close',
        host: `localhost:${TEST_PORT}`,
        myheader1: 'myValue1',
        myheader2: 'myValue2',
      });
    });

    it("getHeaders returns cloned/immutable headers", async () => {
      const headers = { header: "value" };

      let headersSubmitted;
      await createRequestAsync(httpServer, { headers }, request => {
        delete request.getHeaders().header;

        headersSubmitted = request.getHeaders();
        return DEFAULT_RESPONSE;
      });

      expect(headersSubmitted).toEqual({
        connection: 'close',
        host: `localhost:${TEST_PORT}`,
        header: 'value',
      });
    });

  });



  describe('cooked content-type header', () => {

    it('checks if expected media type matches content-type header', async() => {
      await check('application/json', 'application/json', true, 'matches');
      await check('application/json', 'text/plain', false, 'does not match');
      await check('APPLICATION/json', 'application/JSON', true, 'should ignore case');
      await check('   application/json   ', '\tapplication/json\t', true, 'should ignore whitespace');
      await check('application/json;charset=utf-8;foo=bar', 'application/json', true, 'should ignore parameters');
      await check('application/json  ;  charset=utf-8', 'application/json', true, 'should ignore parameters with whitespace');

      async function check(contentType, mediaType, expectedResult, message) {
        const headers = { 'content-type': contentType };

        let hasExpectedContentType;
        await createRequestAsync(httpServer, { headers }, request => {
          hasExpectedContentType = request.hasContentType(mediaType);
          return DEFAULT_RESPONSE;
        });

        expect(hasExpectedContentType, message).toEqual(expectedResult);
      }
    });

    it("still works when content-type header doesn't exist", async () => {
      let hasExpectedContentType;
      await createRequestAsync(httpServer, {}, request => {
        hasExpectedContentType = request.hasContentType('application/json');
        return DEFAULT_RESPONSE;
      });

      expect(hasExpectedContentType).toEqual(false);
    });

  });
});


async function createRequestAsync(httpServer, options, fnAsync) {
  await httpServer.start({ port: TEST_PORT, onRequestAsync: fnAsync });
  try {
    await testHelper.requestAsync({port: TEST_PORT, ...options});
  } finally {
    await httpServer.stop();
  }
}


/**
 *
 * @param {HttpServer} httpServer
 * @param {String=} method
 * @param {function(httpRequest: HttpRequest)} onRequestAsync
 * @param {Object.<String,String>=} headers
 * @returns {Promise<*>}
 */
async function requestAsync(httpServer, { method, onRequestAsync, headers }) {
  return startAndStopAsync(httpServer, { onRequestAsync }, async () => ({
    response: await testHelper.requestAsync({ method, headers, port: TEST_PORT })
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

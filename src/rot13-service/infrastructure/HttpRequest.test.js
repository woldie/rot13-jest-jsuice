const td = require('testdouble');
const { IncomingMessage } = require('http');
const testHelper = require('../../rot13-test-utils/testHelper');
const injector = require('../../sociable-jsuice');

const PORT = 5001;

describe('HttpRequest', () => {
  /** @type {HttpRequest} */
  let httpRequest;

  /**
   * @type {NodeRequest}
   */
  let nodeRequest;

  /**
   * @type {Instancer<HttpServer>}
   */
  let httpServerInstancer;

  describe('raw data', () => {
    beforeEach(() => {
      nodeRequest = td.instance(IncomingMessage);

      [ httpRequest, httpServerInstancer ] = injector.collaborators(
        injector.systemUnderTest('httpRequest', nodeRequest),
        injector.instancer('httpServer')
      );
    });

    it("provides URL's pathname (which ignores query)", async () => {
      expect.assertions(1);
      await createRequestAsync({ url: '/my-url?query' }, (request) => {
        expect(request.getUrlPathname()).toEqual('/my-url');
      });
    });
  });

  /**
   *
   * @param {{ url: String=, status: Number=, headers: Object.<String,String>=, body: String= }} options
   * @param {function(httpRequest: HttpRequest)} fnAsync
   * @returns {Promise<void>}
   */
  async function createRequestAsync(options, fnAsync) {
    const server = /** @type {HttpServer} */ httpServerInstancer();
    await server.start({ port: PORT, onRequestAsync: fnAsync });
    await testHelper.requestAsync({ port: PORT, ...options });
    await server.stop();
  }
});

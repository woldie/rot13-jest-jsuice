const td = require('testdouble');
const { IncomingMessage } = require('http');
const testHelper = require('../rot13-test-utils/testHelper');
const injector = require('../sociable-jsuice');

const PORT = 5001;

describe('HttpRequest', () => {
  /** @type {HttpRequest} */
  let httpRequest;

  /**
   * @type {module:http.IncomingMessage}
   */
  let nodeRequest;

  describe('raw data', () => {
    beforeEach(() => {
      nodeRequest = td.instance(IncomingMessage);

      [ httpRequest ] = injector.collaborators(
        injector.systemUnderTest('httpRequest', nodeRequest),
      );
    });

    it("provides URL's pathname (which ignores query)", async () => {
      nodeRequest.url = '/my-url?query'

      expect(httpRequest.getUrlPathname()).toEqual('/my-url');
    });

    it('decodes encoded URLs', () => {
      nodeRequest.url = '/a%3F%20%26%23b';

      expect(httpRequest.getUrlPathname()).toEqual('/a? &#b');
    });

    it('provides method (and normalizes case)', () => {
      nodeRequest.method = 'POst';

      expect(httpRequest.getMethod()).toEqual('POST');
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

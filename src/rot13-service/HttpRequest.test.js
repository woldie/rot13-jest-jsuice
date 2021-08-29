const { EventEmitter } = require('events');
const td = require('testdouble');
const { IncomingMessage } = require('http');
const testHelper = require('../rot13-test-utils/testHelper');
const injector = require('../sociable-jsuice');

const TEST_PORT = 5001;

describe('HttpRequest', () => {
  /** @type {HttpRequest} */
  let httpRequest;

  /** @type {EventEmitter} */
  let nodeRequest;

  describe('raw data', () => {
    beforeEach(() => {
      nodeRequest = new EventEmitter();

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

    it('provides body', async () => {
      const requestResponse = httpRequest.readBodyAsync();

      // simulate the incoming data
      nodeRequest.emit('data', 'chunk 1');
      nodeRequest.emit('data', 'chunk 2');
      nodeRequest.emit('end');

      const submittedBody = await requestResponse;
      expect(submittedBody).toEqual('chunk 1chunk 2');
    });

    it('fails fast if body is read twice', async () => {
      const requestResponse = httpRequest.readBodyAsync();

      // simulate the incoming data and wait for the response
      nodeRequest.emit('data', 'dadada');
      nodeRequest.emit('end');
      await requestResponse;

      // try to read the response again, should fail
      expect.assertions(1);
      try {
        await httpRequest.readBodyAsync();
      } catch (e) {
        expect(e.message).toMatch(/Can't read request body because it's already been read/);
      }
    });
  });
});

/* eslint-disable global-require,prefer-destructuring,no-bitwise,no-param-reassign */
// noinspection JSBitwiseOperatorUsage

const isString = require('lodash.isstring');

const StatusCodes = require('http-status-codes');
const injector = require('../../sociable-jsuice');

require('../moduleGroup');

const VALID_URL = '/rot13/transform';
const VALID_METHOD = 'POST';
const VALID_HEADERS = { 'content-type': "application/json" };

describe('Rot13Router', () => {
  let /** @type {TimeKeeper} */ timeKeeper;
  let /** @type {Rot13Router} */ rot13Router;
  let /** @type {FactoryFunction<HttpRequest>} */ httpRequestFactory;
  let /** @type {Object.<String,*>} */ context;
  let /** @type {Clock} */ fakeTimers; // Sinon fake timers
  let /** @type {NodeRequest} */ nodeRequest;
  let /** @type {HttpRequest} */ httpRequest;
  let /** @type {Rot13Response} */ rot13Response;
  let /** @type {Rot13} */ rot13;

  beforeEach(() => {
    [ rot13Response, rot13, timeKeeper, httpRequestFactory, rot13Router ] = injector.collaborators(
      'rot13Response',
      'rot13',
      injector.partialMock('timeKeeper', require('../infrastructure/ClockWrap.mock')),
      injector.factoryFunction('httpRequest', require('../infrastructure/NodeRequest.mock')),
      injector.systemUnderTest('rot13Router')
    )

    context = injector.getInjectorContext();

    // the sinon fakeTimers which were set in the injector context by TimeKeeper.mock
    fakeTimers = context.fakeTimers;

    httpRequest = httpRequestFactory();
    nodeRequest = context.nodeRequest;
  });

  describe('happy path', () => {
    it('transforms requests when current timestamp is even', async () => {
      const response = await simulateImmediateRequestAsync({
        url: VALID_URL,
        method: VALID_METHOD,
        headers: VALID_HEADERS,
        body: validBody('hello')
      });
      assertOkResponse(response, 'hello');
    });
  });

  describe('bad requests', () => {
    test.each`
      badInputs                                       | expectedStatus                    | expectedErrorBody
      ${{ url: '/wrong/service' }}                    | ${StatusCodes.NOT_FOUND}          | ${{ error: 'not found' }}
      ${{ method: 'DELETE' }}                         | ${StatusCodes.METHOD_NOT_ALLOWED} | ${{ error: 'method not allowed' }}
      ${{ headers: { 'content-type': 'image/png' }}}  | ${StatusCodes.BAD_REQUEST}        | ${{ error: 'invalid content-type header' }}
    `('will return notFound response if path is not /rot13/transform', async ({ badInputs, expectedStatus, expectedErrorBody }) => {
      // GIVEN: we create a HttpRequest infrastructure with a node request defaults
      /** @type {HttpRequest} */ const httpRequest = httpRequestFactory();
      /** @type {NodeRequest} */ const nodeRequest = context.nodeRequest;

      // AND: we taint the nodeRequest with badInputs
      Object.assign(nodeRequest, badInputs);

      // WHEN: we await routeAsync
      const errorResponse = await rot13Router.routeAsync(httpRequest);

      // THEN: we get the expected error response back
      expect(errorResponse).toEqual(expectedErrorResponse(expectedStatus, expectedErrorBody));
    });
  });

  /**
   * @param {Number} status
   * @param {Object} body
   */
  function expectedErrorResponse(status, body) {
    return {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body, null, 0)
    };
  }

  async function simulateImmediateRequestAsync({
                                                 url = VALID_URL,
                                                 method = VALID_METHOD,
                                                 headers = VALID_HEADERS,
                                                 body = { text: "irrelevant-body" },
                                               } = {}) {
    if (typeof body === "object") body = JSON.stringify(body);

    // Update node request with parameters
    Object.assign(nodeRequest, { url, method, headers, body: isString(body) ? body : JSON.stringify(body) });

    // tick the fakeTimer until its now millisecond is an even number
    let now;
    do {
      now = context.fakeTimers.tick(1);
    } while (now & 1);  // will be falsy when now is an even number

    return rot13Router.routeAsync(httpRequest, clock);
  }

  /**
   * @param {String} text
   * @returns {{text: String}}
   */
  function validBody(text) {
    return { text };
  }

  function assertOkResponse(response, originalText) {
    expect(response).toEqual(rot13Response.ok(rot13.transform(originalText)));
  }
});

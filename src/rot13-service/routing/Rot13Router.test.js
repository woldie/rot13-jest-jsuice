/* eslint-disable global-require */
const StatusCodes = require('http-status-codes');
const injector = require('../../sociable-jsuice');

require('../moduleGroup');
require('../../rot13-utils/moduleGroup');

describe('Rot13Router', () => {
  /**
   * @type {TimeKeeper}
   */
  let timeKeeper;

  /**
   * @type {Rot13Router}
   */
  let rot13Router;

  /**
   * @type {FactoryFunction<HttpRequest>}
   */
  let httpRequestFactory;

  /**
   * @type {Object.<String,*>}
   */
  let context;

  /**
   * Sinon fake timers
   * @type {Clock}
   */
  let fakeTimers;

  beforeEach(() => {
    [ clock, rot13Router, httpRequestFactory ] = injector.collaborators(
      require('../../rot13-utils/Timekeeper.mock'),
      injector.systemUnderTest('rot13Router'),
      injector.factoryFunction('httpRequest', require('../infrastructure/NodeRequest.mock'))
    )

    context = injector.getInjectorContext();

    // the sinon fakeTimers which were set in the injector context by Clock.mock
    fakeTimers = context.fakeTimers;
  });

  describe('bad requests', () => {
    test.each`
      badInputs                                       | expectedStatus                    | expectedErrorBody
      ${{ url: '/wrong/service' }}                    | ${StatusCodes.NOT_FOUND}          | ${{ error: 'not found' }}
      ${{ method: 'DELETE' }}                         | ${StatusCodes.METHOD_NOT_ALLOWED} | ${{ error: 'method not allowed' }}
      ${{ headers: { 'content-type': 'image/png' }}}  | ${StatusCodes.BAD_REQUEST}        | ${{ error: 'invalid content-type header' }}
    `('will return notFound response if path is not /rot13/transform', async ({ badInputs, expectedStatus, expectedErrorBody }) => {
      // GIVEN: we create a HttpRequest infrastructure with a node request defaults
      const httpRequest = /** @type {HttpRequest} */ httpRequestFactory();
      const nodeRequest = /** @type {NodeRequest} */ context.nodeRequest;

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
});

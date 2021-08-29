/* eslint-disable prefer-rest-params */
const { signatureCheck }  = require('../../rot13-utils/typeCheck');
const injector = require('../../jsuice');
const HttpRequest = require('../HttpRequest');

const { Scope } = injector;

const REQUEST_TYPE = { text: String };

// when the timestamp is odd, we delay before returning the response.
const DELAY_IN_MS = 30000;

class Rot13Router {
  /**
   * @param {TimeKeeper} timeKeeper
   * @param {Rot13} rot13
   * @param {Rot13Response} rot13Response
   */
  constructor(timeKeeper, rot13, rot13Response) {
    /**
     * @name Rot13Router#timeKeeper
     * @type {TimeKeeper}
     */
    this.timeKeeper = timeKeeper;

    /**
     * @name Rot13Router#rot13
     * @type {Rot13}
     */
    this.rot13 = rot13;

    /**
     * @name Rot13Router#rot13Response
     * @type {Rot13Response}
     */
    this.rot13Response = rot13Response;
  }

  /**
   * @param {HttpRequest} request
   * @returns {Promise<{headers: Object=, body: String=, status: Number}>}
   */
  async route(request) {
    signatureCheck(arguments, [ HttpRequest ]);

    if (request.getUrlPathname() !== '/rot13/transform') {
      return this.rot13Response.notFound();
    }
    if (request.getMethod() !== 'POST') {
      return this.rot13Response.methodNotAllowed();
    }
    if (!request.hasContentType('application/json')) {
      return this.rot13Response.badRequest('invalid content-type header');
    }

    const jsonString = await request.readBodyAsync();
    let json;
    try {
      json = JSON.parse(jsonString);
      signatureCheck([ json ], [ REQUEST_TYPE ], [ 'request' ], true);
    } catch (err) {
      return this.rot13Response.badRequest(err.message);
    }

    if (this.timestampIsOdd()) {
      await this.timeKeeper.waitAsync(DELAY_IN_MS);
    }

    const input = json.text;
    const output = this.rot13.transform(input);
    return this.rot13Response.ok(output);
  }

  /**
   * @private
   * @ignore
   * @returns {boolean}
   */
  timestampIsOdd() {
    return (this.timeKeeper.now() % 2 === 1);
  }
}

injector.annotateConstructor(Rot13Router, Scope.PROTOTYPE, 'timeKeeper', 'rot13', 'rot13Response');

module.exports = Rot13Router;

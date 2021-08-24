/* eslint-disable prefer-rest-params */
const { signatureCheck }  = require('../../rot13-utils/typeCheck');
const injector = require('../../jsuice');
const HttpRequest = require('../HttpRequest');

const { Scope } = injector;

class Rot13Router {
  /**
   * @param {TimeKeeper} timeKeeper
   * @param {Rot13Response} rot13Response
   */
  constructor(timeKeeper, rot13Response) {
    /**
     * @name Rot13Router#timeKeeper
     * @type {TimeKeeper}
     */
    this.timeKeeper = timeKeeper;

    /**
     * @name Rot13Router#rot13Response
     * @type {Rot13Response}
     */
    this.rot13Response = rot13Response;
  }

  async routeAsync(request) {
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

    return null;
  }
}

injector.annotateConstructor(Rot13Router, Scope.PROTOTYPE, 'timeKeeper', 'rot13Response');

module.exports = Rot13Router;

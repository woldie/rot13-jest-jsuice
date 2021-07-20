/* eslint-disable prefer-rest-params */
const { typeCheck }  = require('../../rot13-utils/typeCheck');
const injector = require('../../jsuice');
const HttpRequest = require('../infrastructure/HttpRequest');

const { Scope } = injector;

class Rot13Router {
  /**
   * @param {Clock} clock
   * @param {Rot13Response} rot13Response
   */
  constructor(clock, rot13Response) {
    this.clock = clock;
    this.rot13Response = rot13Response;
  }

  async routeAsync(request) {
    typeCheck(arguments, [ HttpRequest ]);

    if (request.urlPathname !== '/rot13/transform') return this.rot13Response.notFound();
    // if (request.)
    return null;
  }
}

injector.annotateConstructor(Rot13Router, Scope.PROTOTYPE, 'clock', 'rot13Response');

module.exports = Rot13Router;

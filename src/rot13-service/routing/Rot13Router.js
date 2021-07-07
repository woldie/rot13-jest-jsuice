const injector = require('../../jsuice');

const { Scope } = injector;

class Rot13Router {
  /**
   * @param {Clock} clock
   */
  constructor(clock) {
    this.clock = clock;
  }

  async routeAsync(request) {
    return null;
  }
}

injector.annotateConstructor(Rot13Router, Scope.PROTOTYPE, 'clock');

module.exports = Rot13Router;

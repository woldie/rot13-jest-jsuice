const injector = require('../jsuice');

class Rot13Server {
  constructor() {

  }

  async launch() {

  }
}

injector.annotateConstructor(Rot13Server, injector.Scope.SINGLETON);

module.exports = Rot13Server;

const injector = require('../jsuice');

class AdminServer {
  constructor() {

  }

  async launch() {

  }
}

injector.annotateConstructor(AdminServer, injector.Scope.SINGLETON);

module.exports = AdminServer;

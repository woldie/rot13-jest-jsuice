require('./rot13-utils/moduleGroup');
require('./rot13-service/moduleGroup');

const injector = require('./jsuice');

(async function launchRot13Server() {
  /** @type {AdminServer} */
  const adminServer = injector.getInstance('adminServer');

  /** @type {Rot13Server} */
  const rot13Server = injector.getInstance('rot13Server');

  await Promise.all([ adminServer.launch(), rot13Server.launch() ]);
})();

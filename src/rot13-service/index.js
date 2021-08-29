const injector = require('../jsuice');

require('./moduleGroup');

/** Application entry point */

const rot13Server = /** @type {Rot13Server} */ injector.getInstance('rot13Server');

(async () => {
  await rot13Server.launch();
})();

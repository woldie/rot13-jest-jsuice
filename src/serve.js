require('./rot13-utils/moduleGroup');
require('./rot13-service/moduleGroup');

const injector = require('./jsuice');

(async function launchRot13Server() {
  /** @type {AdminServer} */
  const adminServer = injector.getInstance('adminServer');

  /** @type {Rot13Server} */
  const rot13Server = injector.getInstance('rot13Server');

  const handleTerminationSignal = async (signal) => {
    console.log(`rot13 server shutdown: ${signal}`);

    // prevent re-entrant termination signal handling
    process.removeListener('SIGINT', handleTerminationSignal);
    process.removeListener('SIGTERM', handleTerminationSignal);

    await adminServer.shutdown();

    // graceful termination
    process.exit();
  }

  process.on('SIGINT', handleTerminationSignal);
  process.on('SIGTERM', handleTerminationSignal);

  await Promise.all([ adminServer.launch(), rot13Server.launch() ]);
})();

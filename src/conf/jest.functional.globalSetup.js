const jestDevServer = require('jest-dev-server');
const fsExtra = require('fs-extra');

const Env = require('../rot13-utils/Env');

async function startupLocalDevServer() {
  const OUT_FILE = `${__dirname}/../../logs/functional.out`

  await fsExtra.ensureFile(OUT_FILE);

  const isWatching = process.env.WATCH_FUNCTIONAL === 'true';
  const npmRunCommand = isWatching ?
    `npm run launch:service 1>${OUT_FILE} 2>&1` :
    `nyc --nycrc-path ${__dirname}/nyc.functional.config.js -- npm run launch:service 1>${OUT_FILE} 2>&1`;


  await jestDevServer.setup({
    command: `cd ${__dirname}/../.. && ${npmRunCommand}`,
    launchTimeout: 10000,
    port: Env.getAdminPort()
  });
}

module.exports = startupLocalDevServer;

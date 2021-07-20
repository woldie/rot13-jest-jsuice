const jestDevServer = require('jest-dev-server');
const fsExtra = require('fs-extra');

const Env = require('../rot13-utils/Env');

async function startupLocalDevServer() {
  const OUT_FILE = `${__dirname}/../../logs/functional.out`

  await fsExtra.ensureFile(OUT_FILE);

  await jestDevServer.setup({
    command: `cd ${__dirname}/../.. && nyc --nycrc-path ${
      __dirname}/nyc.functional.config.js -- npm run launch:service 1>${OUT_FILE} 2>&1`,
    launchTimeout: 10000,
    port: Env.getAdminPort()
  });
}

module.exports = startupLocalDevServer;

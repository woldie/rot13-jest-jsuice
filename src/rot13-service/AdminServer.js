// noinspection HttpUrlsUsage

const http = require('http');
const { StatusCodes } = require('http-status-codes');

const injector = require('../jsuice');
const Env = require('../rot13-utils/Env');
const Constants = require('../rot13-utils/Constants');

class AdminServer {
  async launch() {
    this.server = http.createServer();

    await new Promise((resolve, reject) => {
      this.server.on('listening', () => {
        resolve();
      });

      this.server.on('request', (request, response) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        if (request.method === 'GET' && url.pathname === `${Constants.ADMIN_API}/about`) {
          response.status = StatusCodes.OK;
          response.setHeader('Content-Type', 'text/plain');
          response.end('ROT13');
        } else if (request.method === 'GET' && url.pathname === `${Constants.ADMIN_API}/shutdown`) {
          response.status = StatusCodes.OK;
          response.end();
          process.kill(process.pid);
        }
      });

      this.server.on('error', (err) => {
        reject(new Error(`Admin server failure: ${err.message}`));
      });

      this.server.listen(Env.getAdminPort());
    });
  }

  async shutdown() {
    await new Promise((resolve) => {
      this.server.on('close', () => {
        this.server = null;
        resolve();
      });

      this.server.close();
    });
  }
}

injector.annotateConstructor(AdminServer, injector.Scope.SINGLETON);

module.exports = AdminServer;

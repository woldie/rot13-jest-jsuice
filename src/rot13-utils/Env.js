const isUndefined = require('lodash.isundefined');

const Constants = require('./Constants');

class Env {
  /**
   * Base API URL
   * @returns {String}
   */
  static getBaseUrl() {
    return `http://localhost:${Env.getPort()}${Constants.API}`;
  }

  /**
   * Listen port
   * @returns {Number}
   */
  static getPort() {
    return isUndefined(process.env.PORT) ? Constants.PORT : Number(process.env.PORT);
  }

  /**
   * Base Administration URL
   * @returns {String}
   */
  static getAdminBaseUrl() {
    return `http://localhost:${Env.getAdminPort()}${Constants.ADMIN_API}`;
  }

  /**
   * Listen port for server administration
   * @returns {Number}
   */
  static getAdminPort() {
    return isUndefined(process.env.ADMIN_PORT) ? Constants.ADMIN_PORT : Number(process.env.ADMIN_PORT);
  }
}

module.exports = Env;

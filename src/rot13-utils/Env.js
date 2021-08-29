const isUndefined = require('lodash.isundefined');

const Constants = require('./Constants');

const VALID_DEPLOYMENT_ENVIRONMENTS = [ 'local', 'test', 'prod' ];

class Env {
  /**
   * Base API URL
   *
   * @returns {String}
   */
  static getBaseUrl() {
    return `http://localhost:${Env.getPort()}${Constants.API}`;
  }

  /**
   * Listen port
   *
   * @returns {Number}
   */
  static getPort() {
    return isUndefined(process.env.PORT) ? Constants.PORT : Number(process.env.PORT);
  }

  /**
   * Base Administration URL
   *
   * @returns {String}
   */
  static getAdminBaseUrl() {
    return `http://localhost:${Env.getAdminPort()}${Constants.ADMIN_API}`;
  }

  /**
   * Listen port for server administration
   *
   * @returns {Number}
   */
  static getAdminPort() {
    return isUndefined(process.env.ADMIN_PORT) ? Constants.ADMIN_PORT : Number(process.env.ADMIN_PORT);
  }

  /**
   * Get the configured deployment environment via the DEPLOYMENT_ENV environment variable, defaults to 'local'
   *
   * @returns {String} can be either 'local', 'test' or 'prod'
   */
  static getDeploymentEnvironment() {
    const deploymentEnv = (process.env.DEPLOYMENT_ENV || 'local').toLowerCase();

    if (VALID_DEPLOYMENT_ENVIRONMENTS.indexOf(deploymentEnv) < 0) {
      throw new Error(`Invalid deployment environment: ${deploymentEnv}`);
    }

    return deploymentEnv;
  }
}

module.exports = Env;

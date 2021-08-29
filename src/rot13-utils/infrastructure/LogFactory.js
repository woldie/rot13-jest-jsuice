/* eslint-disable prefer-object-spread,no-param-reassign */
const path = require('path');
const pino = require('pino');

const { getCallId } = require('call-id');

const injector = require('../../jsuice');
const Env = require('../Env');

const { Scope, Flags } = injector;

class LogFactory {
  constructor() {
    this.fileConfig = module.require(`../../conf/logConfig.${Env.getDeploymentEnvironment()}`);
  }

  /**
   * Create a logger instance
   *
   * @param {String=} loggerName optional override for name of logger, default is based on the caller's module filename
   * @returns {pino.Logger}
   */
  createLogger(loggerName) {
    loggerName = loggerName || path.parse(getCallId(1).file).name;
    const options = Object.assign({ name: loggerName }, this.fileConfig[0]);
    const logDestination = this.fileConfig[1];

    return pino(options, logDestination);
  }
}

module.exports = injector.annotateConstructor(LogFactory, Scope.SINGLETON + Flags.INFRASTRUCTURE);

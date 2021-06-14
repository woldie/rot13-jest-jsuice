const Logger = require("logarama");

const minLevel = "info";

/**
 * @param {string} namespace
 * @returns {Logger}
 */
function getLogger(namespace) {
  const log = namespace ? new Logger(namespace) : new Logger();

  log.setMinLevel(minLevel);

  return log;
}

module.exports = getLogger;

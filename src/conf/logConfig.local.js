const pino = require('pino');

module.exports = [
  {
    level: 'debug'
  },
  pino.destination(1)   // says to use STDOUT as the Pino logging target
];

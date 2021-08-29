const pino = require('pino');

module.exports = [
  {
    level: 'info'
  },
  pino.destination({
    dest: '/var/log/rot13.log',
    minLength: 4096,
    sync: false
  })
];

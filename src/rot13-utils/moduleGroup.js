const injector = require('../jsuice');

injector.moduleGroup('rot13Utils',
  'clock', require('./Clock')
);

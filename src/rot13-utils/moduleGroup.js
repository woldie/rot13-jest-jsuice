const injector = require('../jsuice');

injector.moduleGroup('rot13Service',
  'clock', require('./Clock')
);

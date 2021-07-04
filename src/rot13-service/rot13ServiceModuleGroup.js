const injector = require('../jsuice');

injector.moduleGroup('rot13Service',
  'rot13', require('./logic/Rot13')
);

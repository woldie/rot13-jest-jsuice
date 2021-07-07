const injector = require('../jsuice');

injector.moduleGroup('rot13Service',
  'rot13', require('./logic/Rot13'),
  'rot13Router', require('./routing/Rot13Router')
);

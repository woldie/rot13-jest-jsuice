const injector = require('../jsuice');

injector.moduleGroup('rot13Service',
  'adminServer', require('./AdminServer'),
  'rot13Server', require('./Rot13Server'),
  'rot13', require('./logic/Rot13'),
  'rot13Router', require('./routing/Rot13Router'),
  'rot13Response', require('./routing/Rot13Response'),
  'httpRequest', require('./infrastructure/HttpRequest')
);

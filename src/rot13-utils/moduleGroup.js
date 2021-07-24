const injector = require('../jsuice');

injector.moduleGroup('rot13Utils',
  'timeKeeper', require('./TimeKeeper')
);

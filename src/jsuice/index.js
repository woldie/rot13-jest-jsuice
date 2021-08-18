const Injector = require('./lib/Injector');
const DependencyGraph = require('./lib/dependencies/DependencyGraph');

// global singleton
module.exports = new Injector(new DependencyGraph());

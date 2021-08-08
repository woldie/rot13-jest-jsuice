const injector = require('../../../jsuice');

require('../../moduleGroup');

const commandLine = /** @type {CommandLine} */ injector.getInstance('commandLine');

const args = commandLine.args();
process.stdout.write(JSON.stringify(args));

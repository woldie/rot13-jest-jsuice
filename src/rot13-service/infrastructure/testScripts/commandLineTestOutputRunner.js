const injector = require('../../../jsuice');

require('../../moduleGroup');

const commandLine = /** @type {CommandLine} */ injector.getInstance('commandLine');

commandLine.writeStdout('my stdout');
commandLine.writeStderr('my stderr');

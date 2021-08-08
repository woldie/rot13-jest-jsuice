/* eslint-disable global-require,no-unused-vars */
const injector = require('../../sociable-jsuice');

require('../moduleGroup');

describe("CommandLine", () => {
  let /** @type {CommandLine} */ commandLine;
  let /** @type {NodeJS.Process} */ currentProcess;

  beforeEach(() => {
    [commandLine, currentProcess] = injector.collaborators(
      injector.systemUnderTest('commandLine'),
      injector.partialMock('currentProcess', require('./CurrentProcess.mock'))
    );
  });

  it('tracks writes to stdout and stderr', () => {
    const stdout = commandLine.trackStdout();
    const stderr = commandLine.trackStderr();

    commandLine.writeStdout('my stdout');
    commandLine.writeStderr('my stderr');
    expect(stdout.length).toEqual(1);
    expect(stdout[0]).toEqual('my stdout');
    expect(stderr.length).toEqual(1);
    expect(stderr[0]).toEqual('my stderr');
  });

});

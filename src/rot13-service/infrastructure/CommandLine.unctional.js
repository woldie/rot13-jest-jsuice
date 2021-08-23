/* eslint-disable global-require,no-unused-vars */
const injector = require('../../sociable-jsuice');

require('../moduleGroup');

const testHelper = require('../../rot13-test-utils/testHelper');

describe("CommandLine.functional", () => {
  let /** @type {CommandLine} */ commandLine;
  let /** @type {NodeJS.Process} */ currentProcess;

  beforeEach(() => {
    [commandLine, currentProcess] = injector.collaborators(
      injector.systemUnderTest('commandLine'),
      'currentProcess'
    );
  });

  it('provides command-line arguments', async () => {
    const args = ['my arg 1', 'my arg 2'];
    const {stdout} = await testHelper.runModuleAsync(
      __dirname,
      './testScripts/commandLineTestArgsRunner.js',
      {args}
    );
    expect(stdout).toEqual('["my arg 1","my arg 2"]');
  });

  it('writes to stdout and stderr', async () => {
    const {stdout, stderr} = await testHelper.runModuleAsync(
      __dirname,
      './testScripts/commandLineTestOutputRunner.js',
      {failOnStderr: false}
    );
    expect(stdout, 'stdout').toEqual('my stdout');
    expect(stderr, 'stderr').toEqual('my stderr');
  });
});

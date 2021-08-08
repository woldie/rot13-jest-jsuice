/* eslint-disable prefer-rest-params */
const EventEmitter = require('events');
const { trackOutput } = require('./infrastructureHelper');
const { signatureCheck }  = require('../../rot13-utils/typeCheck');
const injector = require('../../jsuice');

const { Scope } = injector;

const STDOUT_EVENT = "stdout";
const STDERR_EVENT = "stderr";

/**
 * Wrapper for command-line processing
 */
class CommandLine {
  /**
   * @param {NodeJS.Process} currentProcess
   */
  constructor(currentProcess) {
    /**
     * @name CommandLine#process
     * @type {NodeJS.Process}
     * @private
     */
    this.process = currentProcess;

    /**
     * @name CommandLine#emitter
     * @type {module:events.EventEmitter}
     * @private
     */
    this.emitter = new EventEmitter();
  }

  args() {
    signatureCheck(arguments, []);
    return this.process.argv.slice(2);
  }

  writeStdout(text) {
    signatureCheck(arguments, [ String ]);
    this.process.stdout.write(text);
    this.emitter.emit(STDOUT_EVENT, text);
  }

  writeStderr(text) {
    signatureCheck(arguments, [ String ]);
    this.process.stderr.write(text);
    this.emitter.emit(STDERR_EVENT, text);
  }

  trackStdout() {
    return trackOutput(this.emitter, STDOUT_EVENT);
  }

  trackStderr() {
    return trackOutput(this.emitter, STDERR_EVENT);
  }
}

module.exports = injector.annotateConstructor(CommandLine, Scope.SINGLETON, 'currentProcess');

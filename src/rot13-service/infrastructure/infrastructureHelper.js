/* eslint-disable prefer-rest-params */
const EventEmitter = require("events");
const { signatureCheck }  = require('../../rot13-utils/typeCheck');

/** A utility function for infrastructure wrappers to track output */
function trackOutput(emitter, event) {
  signatureCheck(arguments, [ EventEmitter, String ]);

  const output = [];
  const trackerFn = (text) => output.push(text);
  emitter.on(event, trackerFn);

  output.off = () => {
    output.consume();
    emitter.off(event, trackerFn);
  };
  output.consume = () => {
    const result = [ ...output ];
    output.length = 0;
    return result;
  };
  return output;
}

module.exports = { trackOutput };

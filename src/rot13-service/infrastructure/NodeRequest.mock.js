/* eslint-disable prefer-rest-params */
const EventEmitter = require('events');
const reduce = require('lodash.reduce');

const injector = require('../../sociable-jsuice');
const { signatureCheck }  = require('../../rot13-utils/typeCheck');

const mockNodeRequestCustomizer = (injectableName, mockObj, context) => {
  class FakeNodeRequest extends EventEmitter {
    constructor({
                  url = "/null-request-url",
                  method = "GET",
                  headers = {},
                  body = "",
                } = {}) {
      signatureCheck(arguments, [[ undefined, {
        url: [ undefined, String ],
        method: [ undefined, String ],
        headers: [ undefined, Object ],
        body: [ undefined, String ],
      }]]);

      super();
      this.url = url;
      this.method = method.toUpperCase();
      this.headers = normalizeHeaders(headers);
      this.body = body;
      this.readableEnded = false;
    }

    on(event, fn) {
      super.on(event, fn);
      if (event === 'end') {
        setImmediate(() => {
          this.emit('data', this.body);
          this.emit('end');
          this.readableEnded = true;
        });
      }
      return this;
    }
  }

  context.nodeRequest = new FakeNodeRequest({
    url: '/rot13/transform',
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: ''
  });

  return context.nodeRequest;
};

function normalizeHeaders(headers) {
  return reduce(headers, (accumulator, value, key) => {
    accumulator[key.toLowerCase()] = value;
    return accumulator;
  }, {});
}

module.exports = mockNodeRequestCustomizer;

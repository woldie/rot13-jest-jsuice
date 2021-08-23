/* eslint-disable no-unused-vars,prefer-rest-params */
// noinspection UnnecessaryLocalVariableJS

const td = require('testdouble');

const { Server, IncomingRequest, ServerResponse } = require('http');
const EventEmitter = require('events');
const reduce = require('lodash.reduce');
const { signatureCheck } = require('../../rot13-utils/typeCheck');

class FakeIncomingRequest extends EventEmitter {
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

class FakeNodeServer extends EventEmitter {
  listen() {
    setImmediate(() => this.emit('listening'));
  }

  close() {
    setImmediate(() => this.emit('close'));
  }

  /**
   * @param {SimulatedNodeRequestData} requestData
   * @returns {{ nodeResponse: td.DoubledObject.<ServerResponse>, nodeRequest: FakeIncomingRequest }}
   */
  simulateRequest(requestData) {
    const nodeRequest = new FakeIncomingRequest(requestData);
    const nodeResponse = td.instance(ServerResponse);

    setImmediate(() => this.emit('request', nodeRequest, nodeResponse))

    return {
      nodeRequest, nodeResponse
    };
  }
}


function normalizeHeaders(headers) {
  return reduce(headers, (accumulator, value, key) => {
    accumulator[key.toLowerCase()] = value;
    return accumulator;
  }, {});
}

const mockNodeServerFactoryCustomizer = (injectableName, mockObj, context) => {
  const nodeServerFactory = /** @type {NodeServerFactory} */ mockObj;

  td.when(nodeServerFactory.create())
      .thenDo(() => new FakeNodeServer());
};

module.exports = mockNodeServerFactoryCustomizer;

/**
 * @typedef {{ url: String, method: String, headers: Object.<String,String>, body: String }} SimulatedNodeRequestData
 */

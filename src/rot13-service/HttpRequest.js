/* eslint-disable prefer-rest-params */
const isUndefined = require('lodash.isundefined');
const injector = require('../jsuice');
const { signatureCheck }  = require('../rot13-utils/typeCheck');

const { Scope, Flags } = injector;

class HttpRequest {
  /**
   * @param {NodeRequest} nodeRequest
   */
  constructor(nodeRequest) {
    /**
     * @name HttpRequest#nodeRequest
     * @type {NodeRequest}
     */
    this.nodeRequest = nodeRequest;

    /**
     * @name HttpRequest#responseRead
     * @type {boolean}
     */
    this.responseRead = false;
  }

  getUrlPathname() {
    const url = new URL(this.nodeRequest.url, 'http://unknown.host');
    return decodeURIComponent(url.pathname);
  }

  getMethod() {
    return this.nodeRequest.method;
  }

  getHeader(whichHeader) {
    return this.nodeRequest.headers[whichHeader];
  }

  getHeaders() {
    return { ...this.nodeRequest.headers };
  }

  hasContentType(expectedMediaType) {
    signatureCheck(arguments, [ String ]);

    const contentType = this.getHeader('content-type');
    if (isUndefined(contentType)) {
      return false;
    }

    const [ mediaType ] = contentType.split(';');
    return mediaType.trim().toLowerCase() === expectedMediaType.trim().toLowerCase();
  }

  /**
   * @returns {Promise<String>}
   */
  async readBodyAsync() {
    return new Promise((resolve, reject) => {
      signatureCheck(arguments, []);
      if (this.responseRead) {
        reject(new Error("Can't read request body because it's already been read"));
        return;
      }
      this.responseRead = true;

      let body = '';
      this.nodeRequest.on('error', reject);
      this.nodeRequest.on('data', (chunk) => {
        body += chunk;
      });
      this.nodeRequest.on('end', () => {
        resolve(body);
      });
    });
  }
}

module.exports = injector.annotateConstructor(HttpRequest, Scope.PROTOTYPE + Flags.INFRASTRUCTURE, 1);

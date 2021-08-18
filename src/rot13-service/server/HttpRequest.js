/* eslint-disable prefer-rest-params */
// Copyright Titanium I.T. LLC.
const EventEmitter = require("events");
const { signatureCheck } = require('../../rot13-utils/typeCheck');

const injector = require('../../jsuice');

const { Scope } = injector;

/** Wrapper for HTTP requests */
class HttpRequest {
  constructor(nodeRequest) {
    /**
     * @name HttpRequest#nodeRequest
     * @type {module:http.ClientRequest}
     */
    this.nodeRequest = nodeRequest;
  }

  getUrlPathname() {
    const url = new URL(this.nodeRequest.url, 'http://unknown.host');
    return decodeURIComponent(url.pathname);
  }

  getMethod() {
    return this.nodeRequest.method;
  }

  getHeader(name) {
    return this.nodeRequest.headers[name];
  }

  getHeaders() {
    return { ...this.nodeRequest.headers };
  }

  hasContentType(expectedMediaType) {
    signatureCheck(arguments, [ String ]);

    const contentType = this.getHeader('content-type');
    if (contentType === undefined) return false;

    const [ mediaType ] = contentType.split(";");
    return mediaType.trim().toLowerCase() === expectedMediaType.trim().toLowerCase();
  }

  async readBodyAsync() {
    signatureCheck(arguments, []);

    if (this.nodeRequest.readableEnded) throw new Error("Can't read request body because it's already been read");

    return new Promise((resolve, reject) => {
      let body = "";
      this.nodeRequest.on("error", reject);    // this event is not tested
      this.nodeRequest.on("data", (chunk) => {
        body += chunk;
      });
      this.nodeRequest.on("end", () => {
        resolve(body);
      });
    });
  }
}


// class NullNodeRequest extends EventEmitter {
//
//   constructor({
//                 url = "/null-request-url",
//                 method = "GET",
//                 headers = {},
//                 body = "",
//               } = {}) {
//     ensure.signature(arguments, [[ undefined, {
//       url: [ undefined, String ],
//       method: [ undefined, String ],
//       headers: [ undefined, Object ],
//       body: [ undefined, String ],
//     }]]);
//
//     super();
//     this.url = url;
//     this.method = method.toUpperCase();
//     this.headers = normalizeHeaders(headers);
//     this._body = body;
//     this.readableEnded = false;
//   }
//
//   on(event, fn) {
//     super.on(event, fn);
//     if (event === "end") {
//       setImmediate(() => {
//         this.emit("data", this._body);
//         this.emit("end");
//         this.readableEnded = true;
//       });
//     }
//   }
//
// }
//
// function normalizeHeaders(headers) {
//   const normalizedEntries = Object.entries(headers).map(([ name, value ]) => [ name.toLowerCase(), value ]);
//   return Object.fromEntries(normalizedEntries);
// }

module.exports = injector.annotateConstructor(HttpRequest, Scope.PROTOTYPE, 1);

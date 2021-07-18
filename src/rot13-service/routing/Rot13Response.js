/* eslint-disable prefer-rest-params */
const { typeCheck }  = require('../../rot13-utils/typeCheck');

class Rot13Response {
  ok(output) {
    typeCheck(arguments,[ String ]);
    return response(200, { transformed: output });
  }

  notFound() {
    typeCheck(arguments,[]);
    return errorResponse(404, 'not found');
  }

  methodNotAllowed() {
    typeCheck(arguments,[]);
    return errorResponse(405, 'method not allowed');
  }

  badRequest(errorMessage) {
    typeCheck(arguments,[ String ]);
    return errorResponse(400, errorMessage);
  }
}

function errorResponse(status, error) {
  return response(status, { error });
}

function response(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

module.exports = Rot13Response;

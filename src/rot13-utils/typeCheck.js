/* eslint-disable no-param-reassign */
const type = require('./type');

module.exports = {
  typeCheck: (args, signature, names) => {
    checkSignature(false, args, signature, names);
  }
};

function isTrue(variable, message) {
  if (message === undefined) message = "Expected condition to be true";

  if (variable === false) throw new Error(message);
  if (variable !== true) throw new Error("Expected condition to be true or false");
}

function checkSignature(allowExtra, args, signature = [], names = []) {
  isTrue(Array.isArray(signature), "ensure.signature(): signature parameter must be an array");
  isTrue(Array.isArray(names), "ensure.signature(): names parameter must be an array");

  const expectedArgCount = signature.length;
  const actualArgCount = args.length;

  if (!allowExtra && (actualArgCount > expectedArgCount)) {
    throw new Error(`Function called with too many arguments: expected ${expectedArgCount} but got ${actualArgCount}`);
  }

  signature.forEach((expectedType, i) => {
    const name = names[i] ? names[i] : `Argument #${(i + 1)}`;
    checkType(args[i], expectedType, allowExtra, name);
  });
}

function checkType(variable, expectedType, allowExtraKeys, name) {
  const error = type.check(variable, expectedType, { name: normalize(name), allowExtraKeys });
  if (error !== null) throw new Error(error);
}

function normalize(variableName) {
  return variableName || 'variable';
}



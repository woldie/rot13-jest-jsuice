const join = require('lodash.join');
const map = require('lodash.map');
const check = require('check-types');
const GraphemeSplitter = require('grapheme-splitter');
const injector = require('../../jsuice');

const { Scope } = injector;
const graphemeSplitter = new GraphemeSplitter();

function splitOnGraphemes(input) {
  return graphemeSplitter.splitGraphemes(input);
}

function transformGrapheme(grapheme) {
  return (grapheme.length === 1) ? transformLetter(grapheme) : grapheme;
}

function transformLetter(letter) {
  let charCode = codeFor(letter);

  if (isBetween(charCode, 'a', 'm') || isBetween(charCode, 'A', 'M')) charCode += 13;
  else if (isBetween(charCode, 'n', 'z') || isBetween(charCode, 'N', 'Z')) charCode -= 13;

  return String.fromCharCode(charCode);
}

function isBetween(charCode, firstLetter, lastLetter) {
  return charCode >= codeFor(firstLetter) && charCode <= codeFor(lastLetter);
}

function codeFor(letter) {
  return letter.charCodeAt(0);
}

class Rot13 {
  /**
   * @param {String} input
   * @returns {String}
   */
  transform(input) {
    check.string(input);

    return join(map(splitOnGraphemes(input), grapheme => transformGrapheme(grapheme)), '');
  }
}

injector.annotateConstructor(Rot13, Scope.SINGLETON);

module.exports = Rot13;

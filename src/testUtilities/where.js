
const forEach = require('lodash.foreach');
const getParamNames = require("get-param-names");

/**
 * Call a function once per parameterSet passed in whereParameterSets.  Useful for parameterizing tests.
 *
 * @param {function} callWith
 * @param {Array.<Object>} whereParameterSets
 */
function where(callWith, whereParameterSets) {
  if(typeof callWith !== "function") {
    throw new Error("callWith not a function");
  }

  const parsedParameterNames = getParamNames(callWith);

  // validate that the exact parameters in each parameterSet are found in argNames
  whereParameterSets.forEach((whereParameterSet, whichParamSet) => {
    let argMatchCount = 0;

    forEach(whereParameterSet, (value, whereParamName) => {
      if(parsedParameterNames.indexOf(whereParamName) < 0) {
        throw new Error(`unknown paramName ${whereParamName} found in parameterSet ${  whichParamSet}`);
      }
      argMatchCount += 1;
    });

    if(argMatchCount !== parsedParameterNames.length) {
      throw new Error(`Required parameters expected in parameterSet ${  whichParamSet}`);
    }
  });

  whereParameterSets.forEach(whereParameterSet => {
    const parameters = parsedParameterNames.map((parsedParameterName) => whereParameterSet[parsedParameterName]);

    callWith.apply(this, parameters);
  });
}

module.exports = where;

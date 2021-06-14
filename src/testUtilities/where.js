"use strict";

var getParamNames = require("get-param-names");

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

  var parsedParameterNames = getParamNames(callWith);

  // validate that the exact parameters in each parameterSet are found in argNames
  whereParameterSets.forEach(function(whereParameterSet, whichParamSet) {
    var whereParamName,
      argMatchCount = 0;

    for(whereParamName in whereParameterSet) {
      if(whereParameterSet.hasOwnProperty(whereParamName) && parsedParameterNames.indexOf(whereParamName) < 0) {
        throw new Error("unknown paramName " + whereParamName + " found in parameterSet " + whichParamSet);
      }
      argMatchCount++;
    }

    if(argMatchCount !== parsedParameterNames.length) {
      throw new Error("Required parameters expected in parameterSet " + whichParamSet);
    }
  });

  whereParameterSets.forEach(function(whereParameterSet) {
    var parameters = parsedParameterNames.map(function(parsedParameterName) {
      return whereParameterSet[parsedParameterName];
    });

    callWith.apply(this, parameters);
  });
}

module.exports = where;

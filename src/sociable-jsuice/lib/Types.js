const td = require('testdouble');

/**
 * @fileOverview Miscellaneous JSDoc types
 */

/**
 * User-defined customizations applicable to mockObj.
 *
 * @typedef {function(injectableName:String,mockObj:td.DoubledObject<*>,context:Object<String,*>)} CustomizerFunction
 */

/**
 * Callback called after a mock or partial mock is created that applies a CustomizerFunction to mock.
 *
 * @typedef {function(mock:td.DoubledObject<*>)} MockCustomizerClosure
 * @package
 */

/**
 * @typedef {(String|SystemUnderTest|SystemUnderTestInstancer|MockCollaborator|PartialMockCollaborator|Instancer)} Collaborator
 * @template T
 */

/**
 * @typedef {module:http.IncomingMessage} NodeRequest
 */


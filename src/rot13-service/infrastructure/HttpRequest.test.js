const td = require('testdouble');
const { IncomingMessage } = require('http');
const injector = require('../../sociable-jsuice');


describe('HttpRequest', () => {
  describe('raw data', () => {
    /**
     * @type {HttpRequest}
     */
    let httpRequest;

    /**
     * @type {module:http.IncomingMessage}
     */
    let nodeRequest;

    beforeEach(() => {
      nodeRequest = td.instance(IncomingMessage);

      [ httpRequest ] = injector.collaborators(
        injector.systemUnderTest('httpRequest', nodeRequest)
      );
    });


  });
});

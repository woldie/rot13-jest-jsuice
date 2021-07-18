/* eslint-disable global-require */
const injector = require('../../sociable-jsuice');

require('../moduleGroup');

describe('Rot13Router', () => {
  /**
   * @type {Clock}
   */
  let clock;

  /**
   * @type {Rot13Router}
   */
  let rot13Router;

  beforeEach(() => {
    [ clock, rot13Router ] = injector.collaborators(
      require('../../rot13-utils/Clock.mock'),
      injector.systemUnderTest('rot13Router')
    )
  });
});

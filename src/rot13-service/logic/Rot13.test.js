const injector = require('../../sociable-jsuice');

require('../rot13ServiceModuleGroup');

describe('Rot13', () => {
  /** @type {Rot13} */ let rot13;

  beforeEach(() => {
    const collaborators = injector.collaboratorSetup({
      SUT: 'rot13'
    });

    rot13 = collaborators.rot13;
  });

  it('does nothing when input is empty', () => {
    expect(rot13.transform('')).toEqual('');
  });

  it('transforms lower-case letters', () => {
    expect(rot13.transform('abcdefghijklmnopqrstuvwxyz')).toEqual('nopqrstuvwxyzabcdefghijklm');
  });

  it('transforms upper-case letters', () => {
    expect(rot13.transform('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toEqual('NOPQRSTUVWXYZABCDEFGHIJKLM');
  });

  it("doesn't transform symbols", () => {
    assertNoTransform(rot13, '`{@[');
  });

  it("doesn't transform numbers", () => {
    assertNoTransform(rot13, '0123456789');
  });

  it("doesn't transform letters with diacritics", () => {
    assertNoTransform(rot13, 'åéîøüçñ');
  });

  it("doesn't break when given emojis", () => {
    assertNoTransform(rot13, '✅🚫🙋');
  });

  it("doesn't break when given zalgo text", () => {
    assertNoTransform(rot13, 'Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍A̴̵̜̰͔ͫ͗͢L̠ͨͧͩ͘G̴̻͈͍͔̹̑͗̎̅͛́Ǫ̵̹̻̝̳͂̌̌͘!͖̬̰̙̗̿̋ͥͥ̂ͣ̐́́͜͞');
  });
});

function assertNoTransform(rot13, input) {
  expect(rot13.transform(input)).toEqual(input);
}

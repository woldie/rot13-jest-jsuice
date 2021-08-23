const request = require('superagent');
const { StatusCodes } = require('http-status-codes');

const Env = require('../rot13-utils/Env');

describe("AdminServer functional", () => {
  it('will return an about string when called', async () => {
    // WHEN: I call the about endpoint on the ADMIN port
    const response = await new Promise((resolve, reject) => {
      request
      .get(`${Env.getAdminBaseUrl()}/about`)
      .end((err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });

    // THEN: response is shaped as expected
    expect(response.status).toEqual(StatusCodes.OK);
    expect(response.header['content-type']).toEqual('text/plain');
    expect(response.text).toContain('ROT13');
  });
});

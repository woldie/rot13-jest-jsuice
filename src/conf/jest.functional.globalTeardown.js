const request = require('superagent');
const { StatusCodes } = require('http-status-codes');

const Env = require('../rot13-utils/Env');

module.exports = async () => {
  // shutdown the integration server
  const response = await new Promise((resolve, reject) => {
    request
      .get(`${Env.getAdminBaseUrl()}/shutdown`)
      .end((err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
  });

  if (response.status !== StatusCodes.OK) {
    throw new Error(`Got unexpected response during shutdown: ${response.status}`);
  }
};

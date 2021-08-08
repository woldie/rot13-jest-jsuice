/* eslint-disable prefer-rest-params */
const http = require('http');
const path = require('path');
const childProcess = require('child_process');
const { signatureCheck } = require('../rot13-utils/typeCheck');

const testHelper = {
  async requestAsync({port, url, method, headers, body = []} = {}) {
    return new Promise((resolve, reject) => {
      signatureCheck(arguments, [
        [
          undefined, {
          port: [Number, String],
          url: [undefined, String],
          method: [undefined, String],
          headers: [undefined, Object],
          body: [undefined, Array],
        }]]);
      // eslint-disable-next-line no-param-reassign
      if (method === undefined && body.length !== 0) method = 'POST';

      const request = http.request({port, path: url, method, headers});
      body.forEach((chunk) => request.write(chunk));
      request.end();

      request.on('response', (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('error', (err) => reject(err));
        response.on('end', () => {
          const { headers } = response;
          delete headers.connection;
          delete headers['content-length'];
          delete headers.date;

          resolve({
            status: response.statusCode,
            headers: response.headers,
            body,
          });
        });
      });
    });
  },

  runModuleAsync(cwd, modulePath, {args = [], failOnStderr = true} = {}) {
    return new Promise((resolve, reject) => {
      signatureCheck(arguments, [
        String, String, [
          undefined, {
            args: [undefined, Array],
            failOnStderr: [undefined, Boolean],
          }]], ['cwd', 'modulePath', 'options']);

      const absolutePath = path.resolve(cwd, modulePath);
      const options = {
        stdio: 'pipe',
      };
      const child = childProcess.fork(absolutePath, args, options);

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (data) => {
        stdout += data;
      });
      child.stderr.on('data', (data) => {
        stderr += data;
      });

      child.on('exit', () => {
        if (failOnStderr && stderr !== '') {
          console.log(stderr);
          return reject(new Error('Runner failed'));
        }
          return resolve({stdout, stderr});

      });
    });
  },

  async ignorePromiseErrorAsync(promise) {
    try {
      await promise;
    } catch (err) {
      // nothing to do
    }
  }
};

module.exports = testHelper;

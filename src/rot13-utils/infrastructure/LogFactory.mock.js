/* eslint-disable no-unused-vars */
const td = require('testdouble');

const mockLogFactoryCustomizer = (injectableName, mockObj, context) => {
  /** @type {LogFactory} */
  const logFactory = mockObj;

  const mockLogger = /** @type {pino.Logger} */ {
    debug: td.function('debug'),
    info: td.function('info'),
    error: td.function('error'),
    fatal: td.function('fatal')
  };

  td.when(logFactory.createLogger(), { ignoreExtraArgs: true })
      .thenReturn(mockLogger);
};

module.exports = mockLogFactoryCustomizer;

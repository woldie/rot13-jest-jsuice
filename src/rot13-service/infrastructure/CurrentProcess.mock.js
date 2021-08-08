const mockProcessCustomizer = (injectableName, mockObj, context) => {
  /** @type {NodeJS.Process} */
  const process = mockObj;

  const { args = [] } = context;

  Object.defineProperty(process, 'argv', {
    get() {
      return [ 'null_process_node', 'null_process_script.js', ...args ];
    }
  });

  Object.defineProperty(process, 'stdout', /** @type {WriteStream} */ {
    write() {}
  });

  Object.defineProperty(process, 'stderr', /** @type {WriteStream} */ {
    write() {}
  });
};

module.exports = mockProcessCustomizer;

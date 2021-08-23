class SystemUnderTestInstancer {
  /**
   * @param {String} injectableName
   * @package
   */
  constructor(injectableName) {
    /**
     * @name SystemUnderTestInstancer#injectableName
     * @type {String}
     */
    this.injectableName = injectableName;
  }
}

module.exports = SystemUnderTestInstancer;

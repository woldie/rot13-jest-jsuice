class SystemUnderTest {
  /**
   * @param {String} injectableName
   * @param {Array.<*>} assistedInjectionParams
   * @package
   */
  constructor(injectableName, assistedInjectionParams) {
    /**
     * @name SystemUnderTest#injectableName
     * @type {String}
     */
    this.injectableName = injectableName;

    /**
     * @name SystemUnderTest#assistedInjectionParams
     * @type {Array.<*>}
     */
    this.assistedInjectionParams = assistedInjectionParams;
  }
}

module.exports = SystemUnderTest;

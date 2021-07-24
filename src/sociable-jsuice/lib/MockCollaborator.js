class MockCollaborator {
  /**
   * @param {String} injectableName
   * @param {MockCustomizerCallback=} customizer
   * @package
   */
  constructor(injectableName, customizer) {
    /**
     * @name MockCollaborator#injectableName
     * @type {String}
     * @package
     */
    this.injectableName = injectableName;

    /**
     * @name MockCollaborator#customizer
     * @type {(MockCustomizerCallback|undefined)}
     * @package
     */
    this.customizer = customizer;
  }
}

module.exports = MockCollaborator;

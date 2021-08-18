class MockCollaborator {
  /**
   * @param {String} injectableName
   * @param {MockCustomizerClosure=} customizer
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
     * @type {(MockCustomizerClosure|undefined)}
     * @package
     */
    this.customizer = customizer;
  }
}

module.exports = MockCollaborator;

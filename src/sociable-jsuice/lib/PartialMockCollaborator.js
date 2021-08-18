class PartialMockCollaborator {
  /**
   * @param {String} injectableName
   * @param {Array.<*>} assistedInjectionParams
   * @param {MockCustomizerClosure=} customizer
   * @package
   */
  constructor(injectableName, assistedInjectionParams, customizer) {
    /**
     * @name PartialMockCollaborator#injectableName
     * @type {String}
     * @package
     */
    this.injectableName = injectableName;

    /**
     * @name PartialMockCollaborator#assistedInjectionParams
     * @type {Array.<*>}
     * @package
     */
    this.assistedInjectionParams = assistedInjectionParams;

    /**
     * @name PartialMockCollaborator#customizer
     * @type {(MockCustomizerClosure|undefined)}
     * @package
     */
    this.customizer = customizer;
  }
}

module.exports = PartialMockCollaborator;

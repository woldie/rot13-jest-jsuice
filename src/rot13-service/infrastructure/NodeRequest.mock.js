const injector = require('../../sociable-jsuice');

module.exports = () => {
  const nodeRequest = {
    url: '/rot13/transform',
    method: 'POST',
    headers: {'content-type': 'application/json'}
  };

  const context = injector.getInjectorContext();
  context.nodeRequest = nodeRequest;

  return nodeRequest;
};

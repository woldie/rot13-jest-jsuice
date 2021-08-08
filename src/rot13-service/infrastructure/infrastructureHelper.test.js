const EventEmitter = require('events');
const infrastructureHelper = require('./infrastructureHelper');

describe('Infrastructure Helper', () => {

  describe('output tracker', () => {

    const EVENT = 'my_event';

    it('tracks emitted events', () => {
      const { emitter, output } = trackOutput();

      emitter.emit(EVENT, 'my output 1');
      emitter.emit(EVENT, 'my output 2');

      expect(output.length).toEqual(2);
      expect(output[0]).toEqual('my output 1');
      expect(output[1]).toEqual('my output 2');
    });

    it('can be turned off', () => {
      const { emitter, output } = trackOutput();

      emitter.emit(EVENT, 'my output 1');
      output.off();
      emitter.emit(EVENT, 'my output 2');

      expect(output.length).toEqual(0);
    });

    it('tracker allows output to be consumed', () => {
      const { emitter, output } = trackOutput();

      emitter.emit(EVENT, 'my output 1');
      const firstConsume = output.consume();
      expect(firstConsume.length).toEqual(1);
      expect(firstConsume[0]).toEqual('my output 1');

      emitter.emit(EVENT, 'my output 2');
      const secondConsume = output.consume();
      expect(secondConsume.length).toEqual(1);
      expect(secondConsume[0]).toEqual('my output 2');
    });

    it('supports arbitrary data types', () => {
      const { emitter, output } = trackOutput();

      emitter.emit(EVENT, { data: [ 'nested', 3.14 ]});
      expect(output.length).toEqual(1);
      expect(output[0]).toEqual({
        data: [ 'nested', 3.14 ]
      });
    });

    function trackOutput() {
      const emitter = new EventEmitter();
      const output = infrastructureHelper.trackOutput(emitter, EVENT);
      return { emitter, output };
    }
  });
});

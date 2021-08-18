/* eslint-disable global-require */
const injector = require('../sociable-jsuice');

require('../rot13-service/moduleGroup');

describe('TimeKeeper', () => {
  let /* @type {TimeKeeper} */ timeKeeper;
  let /* @type {ClockWrap} */ clockWrap;

  function makeCollaborators() {
    [ timeKeeper, clockWrap ] = injector.collaborators(
      injector.systemUnderTest('timeKeeper'),
      'clockWrap'
    );
  }

  function makeCollaboratorsMockedInfrastructure() {
    [ timeKeeper, clockWrap ] = injector.collaborators(
      injector.systemUnderTest('timeKeeper'),
      injector.partialMock('clockWrap')
    );
  }


  describe('waiting', () => {
    it('waits N milliseconds', async () => {
      makeCollaborators();
      const start = timeKeeper.now();
      await timeKeeper.waitAsync(10);
      const elapsedTime = timeKeeper.now() - start;
      expect(elapsedTime).toBeGreaterThanOrEqual(9);
    });
  });


  describe('current time', () => {
    beforeEach(() => {
      makeCollaborators();
    });

    it('provides current timestamp', () => {
      const expected = Date.now();
      const actual = timeKeeper.now();
      expect(actual).toBeGreaterThanOrEqual(expected);
    });

    it("outputs current time using computer's language and time zone", () => {
      const format = {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'local',
      };
      const formatCopy = {...format};
      const jsFormat = {
        dateStyle: 'medium',
        timeStyle: 'short',
      };

      checkToFormattedString(format, jsFormat, 'local', undefined);
      expect(format, 'should not modify original format object').toEqual(formatCopy);
    });

    it('outputs current time using configured time zone and locale', () => {
      const format = {
        timeZone: 'Europe/Paris',
        dateStyle: 'medium',
        timeStyle: 'short',
      };
      const locale = 'fr';
      checkToFormattedString(format, format, locale, locale);
    });

    it("fails fast if time zone isn't specified", () => {
      expect(() => timeKeeper.toFormattedString({}, 'en-US'),
        "Must specify options.timeZone (use 'local' for computer's time zone)").toThrow(Error);
    });

    it("fails fast if locale isn't specified", () => {
      expect(() => timeKeeper.toFormattedString({timeZone: "UTC"}),
        "Must specify locale (use 'local' for computer's default locale)").toThrow(Error);
    });

    function checkToFormattedString(ourFormat, jsFormat, ourLocale, jsLocale) {
      let expected = new Date().toLocaleString(jsLocale, jsFormat);
      const actual = timeKeeper.toFormattedString(ourFormat, ourLocale);
      if (expected !== actual) expected = new Date().toLocaleString(jsLocale, jsFormat);

      expect(actual).toEqual(expected);
    }
  });


  describe('timeouts', () => {
    beforeEach(() => {
      makeCollaboratorsMockedInfrastructure();
    });

    it('resolves if promise resolves before timeout', async () => {
      const timeoutFnAsync = createTimeoutFn();
      const promise = Promise.resolve('result');

      const result = await timeKeeper.timeoutAsync(10000, promise, timeoutFnAsync);
      await expect(result, 'should return result of promise').toEqual('result');
      expect(timeoutFnAsync.ran, 'should not run timeout function').toEqual(false);

      await clockWrap.advanceMockTimersAsync();
      expect(timeKeeper.now(), 'should resolve immediately').toEqual(0);
    });

    it('rejects if promise rejects before timeout', async () => {
      const timeoutFnAsync = createTimeoutFn();
      const promise = Promise.reject(new Error('my error'));

      await expect(timeKeeper.timeoutAsync(10000, promise, timeoutFnAsync), 'should return result of promise')
          .rejects.toThrow('my error');

      expect(timeoutFnAsync.ran, 'should not run timeout function').toEqual(false);

      await clockWrap.advanceMockTimersAsync();
      expect(timeKeeper.now(), 'should resolve immediately').toEqual(0);
    });

    it('resolves via timeout function if promise times out', async () => {
      const timeoutFnAsync = createTimeoutFn('timeout result');

      const promise = new Promise(() => {});
      const timeoutPromise = timeKeeper.timeoutAsync(10000, promise, timeoutFnAsync);

      await clockWrap.advanceMockTimersAsync();

      expect(timeKeeper.now(), 'should wait for timeout').toEqual(10000);
      expect(timeoutFnAsync.ran, 'should run timeout function').toEqual(true);
      expect(await timeoutPromise, 'should return result of timeout function')
          .toEqual('timeout result');
    });

    it('rejects via timeout function if promise times out and timeout rejects', async () => {
      const timeoutFnAsync = createTimeoutFn(new Error('my error'));

      const promise = new Promise(() => {});
      const timeoutPromise = timeKeeper.timeoutAsync(10000, promise, timeoutFnAsync);
      timeoutPromise.catch(() => {});   // prevent 'unhandled promise exception'

      await clockWrap.advanceMockTimersAsync();
      expect(timeKeeper.now(), 'should wait for timeout').toEqual(10000);
      expect(timeoutFnAsync.ran, 'should run timeout function').toEqual(true);

      await expect(() => timeoutPromise, 'should reject because timeout function rejected')
        .rejects.toThrow('my error');
    });

    it('ignores promise rejection after timeout', async () => {
      const timeoutFnAsync = createTimeoutFn('timeout result');
      const promise = (async () => {
        await timeKeeper.waitAsync(20000);
        throw new Error('this error should be ignored');
      })();

      const timeoutPromise = timeKeeper.timeoutAsync(10000, promise, timeoutFnAsync);
      await clockWrap.advanceMockTimersAsync();
      expect(await timeoutPromise).toEqual('timeout result');
    });


    function createTimeoutFn(result = 'default timeout function result') {
      const timeoutFn = () => {
        timeoutFn.ran = true;
        if (result instanceof Error) return Promise.reject(result);
        return Promise.resolve(result);
      };

      timeoutFn.ran = false;
      return timeoutFn;
    }
  });
});

/* eslint-disable no-unused-vars */

const { FakeTimers } = require('@sinonjs/fake-timers');
const td = require('testdouble');
const injector = require('../sociable-jsuice');
const Clock = require('./Clock');

const mockClockConfig = injector.partialMock('clock', (
  injectableName,
  mockObj,
  context
) => {
  /** @type {td.DoubledObject<Clock>} */
  const mockClock = mockObj;

  const { now = 0, locale = 'gc-GB', timeZone = 'Australia/Lord_Howe' } = context
  const fakeTimers = FakeTimers.createClock(now);

  // Install sinon setTimeout
  td.when(mockClock.setTimeout(td.matchers.isA(Function), td.matchers.isA(Number)))
      .thenDo((fn, timeoutMsec) => fakeTimers.setTimeout(fn, timeoutMsec));
});

module.exports = mockClockConfig;

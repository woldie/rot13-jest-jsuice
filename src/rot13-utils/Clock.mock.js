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
  /** @type {Clock} */
  const mockClock = mockObj;

  const { now = 0, locale = 'gc-GB', timeZone = 'Australia/Lord_Howe' } = context
  context.fakeTimers = FakeTimers.createClock(now);

  // Install sinon setTimeout
  td.when(mockClock.setTimeout(td.matchers.isA(Function), td.matchers.isA(Number)))
      .thenDo((fn, timeoutMsec) => context.fakeTimers.setTimeout(fn, timeoutMsec));

  // Install sinon Date.now()
  td.when(mockClock.now())
      .thenDo(() => context.fakeTimers.now());
});

module.exports = mockClockConfig;

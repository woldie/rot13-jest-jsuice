/* eslint-disable no-unused-vars,no-param-reassign */

const FakeTimers = require('@sinonjs/fake-timers');
const td = require('testdouble');

const isUndefined = require('lodash.isundefined');

const mockClockWrapCustomizer = (injectableName, mockObj, context) => {
  /** @type {ClockWrap} */
  const clockWrap = mockObj;

  // pre-load the context with fake clock values or take the defaults below
  const { now = 0, locale = 'gc-GB', timeZone = 'Australia/Lord_Howe' } = context;
  context.fakeTimers = FakeTimers.createClock(now);

  td.when(clockWrap.setTimeout(td.matchers.isA(Function), td.matchers.isA(Number)))
      .thenDo((fn, timeoutMsec) => context.fakeTimers.setTimeout(fn, timeoutMsec));

  td.replace(clockWrap, "Date", context.fakeTimers.Date);

  td.replace(clockWrap, "DateTimeFormat", (locales, options) => {
    if (isUndefined(locales)) locales = locale;
    options = {timeZone, ...options}
    return Intl.DateTimeFormat(locales, options);
  });

  td.when(clockWrap.clearTimeout(td.matchers.anything()))
      .thenDo((timeoutToken) => context.fakeTimers.clearTimeout(timeoutToken));

  td.when(clockWrap.advanceMockAsync(td.matchers.isA(Number)))
      .thenDo(async (msec) => context.fakeTimers.tickAsync(msec));

  td.when(clockWrap.advanceMockTimersAsync())
      .thenDo(async () => context.fakeTimers.runAllAsync());
};

module.exports = mockClockWrapCustomizer;

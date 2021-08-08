/* eslint-disable prefer-rest-params,no-param-reassign,no-return-await,no-async-promise-executor */
const { signatureCheck }  = require('./typeCheck');
const injector = require('../jsuice');

const { Scope } = injector;

class TimeKeeper {
  constructor(clockWrap) {
    /**
     * @name TimeKeeper#clockWrap
     * @type {ClockWrap}
     */
    this.clockWrap = clockWrap;
  }

  /**
   * @returns {number}
   */
  now() {
    signatureCheck(arguments, []);
    return this.clockWrap.Date.now();
  }

  /**
   * @param locales
   * @param options
   * @returns {Intl.DateTimeFormat}
   */
  dateTimeFormat(locales, options) {
    return this.clockWrap.DateTimeFormat(locales, options);
  }

  /**
   * @param fn
   * @param milliseconds
   * @returns {NodeJS.Timeout}
   */
  setTimeout(fn, milliseconds) {
    return this.clockWrap.setTimeout(fn, milliseconds);
  }

  /**
   * @param {NodeJS.Timeout} timeoutId
   */
  clearTimeout(timeoutId) {
    this.clockWrap.clearTimeout(timeoutId);
  }

  toFormattedString(intlDateTimeFormatOptions, locale) {
    if (!intlDateTimeFormatOptions || intlDateTimeFormatOptions.timeZone === undefined) {
      throw new Error("Must specify options.timeZone (use 'local' for computer's time zone)");
    }
    if (locale === undefined) {
      throw new Error("Must specify locale (use 'local' for computer's default locale)");
    }
    signatureCheck(arguments, [ Object, String ]);

    const options = { ...intlDateTimeFormatOptions };
    if (options.timeZone === 'local') delete options.timeZone;
    if (locale === 'local') locale = undefined;

    const now = this.now();
    const formatter = this.dateTimeFormat(locale, options);
    return formatter.format(now);
  }

  async waitAsync(milliseconds) {
    signatureCheck(arguments, [ Number ]);

    await new Promise(resolve => {
      this.setTimeout(resolve, milliseconds);
    });
  }

  async timeoutAsync(milliseconds, promiseToWaitFor, timeoutFnAsync) {
    signatureCheck(arguments, [ Number, Promise, Function ]);

    return await new Promise(async (resolve, reject) => {
      const cancelToken = this.setTimeout(async () => {
        try {
          const result = await timeoutFnAsync();
          resolve(result);
        }
        catch (err) {
          reject(err);
        }
      }, milliseconds);

      try {
        const result = await promiseToWaitFor;
        resolve(result);
      }
      catch (err) {
        reject(err);
      }
      finally {
        this.clearTimeout(cancelToken);
      }
    });
  }
}

module.exports = injector.annotateConstructor(TimeKeeper, Scope.SINGLETON, 'clockWrap');

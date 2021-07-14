/* eslint-disable prefer-rest-params,no-param-reassign,no-return-await,no-async-promise-executor */
const { typeCheck }  = require('type-check');
const injector = require('../jsuice');

const { Scope, Flags } = injector;

class Clock {
  /**
   * @returns {number}
   */
  now() {
    typeCheck('[]', arguments);
    return Date.now();
  }

  /**
   * @param locales
   * @param options
   * @returns {Intl.DateTimeFormat}
   */
  dateTimeFormat(locales, options) {
    return Intl.DateTimeFormat(locales, options);
  }

  /**
   * @param fn
   * @param milliseconds
   * @returns {NodeJS.Timeout}
   */
  setTimeout(fn, milliseconds) {
    return setTimeout(fn, milliseconds);
  }

  /**
   * @param {NodeJS.Timeout} timeoutId
   */
  clearTimeout(timeoutId) {
    clearTimeout(timeoutId);
  }

  toFormattedString(intlDateTimeFormatOptions, locale) {
    if (!intlDateTimeFormatOptions || intlDateTimeFormatOptions.timeZone === undefined) {
      throw new Error("Must specify options.timeZone (use 'local' for computer's time zone)");
    }
    if (locale === undefined) {
      throw new Error("Must specify locale (use 'local' for computer's default locale)");
    }
    typeCheck('[{ timeZone: String }, String]', arguments);

    const options = { ...intlDateTimeFormatOptions };
    if (options.timeZone === 'local') delete options.timeZone;
    if (locale === 'local') locale = undefined;

    const now = this.now();
    const formatter = this.dateTimeFormat(locale, options);
    return formatter.format(now);
  }

  async waitAsync(milliseconds) {
    typeCheck('[Number]', arguments);

    await new Promise(resolve => {
      this.setTimeout(resolve, milliseconds);
    });
  }

  async timeoutAsync(milliseconds, promiseToWaitFor, timeoutFnAsync) {
    typeCheck('[ Number, Promise, Function ]', arguments);

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

injector.annotateConstructor(Clock, Scope.SINGLETON + Flags.BOUNDARY);

module.exports = Clock;

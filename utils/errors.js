const { get } = require('lodash');

class HttpError extends Error {
  constructor(status, code, message, options) {
    super(message);

    if (typeof status !== 'number') {
      throw new Error('Error status must be a number');
    } else if (typeof code !== 'string') {
      throw new Error('Error code must be a string');
    } else if (typeof message !== 'string') {
      throw new Error('Error message must be a string');
    }

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    this.status = status;
    this.code = code;
    this.expose = get(options, 'expose', true);
    this.properties = get(options, 'properties', {});
  }
};

function createError(status, code, message, options) {
  return new HttpError(status, code, message, options);
}

module.exports = { createError, HttpError };

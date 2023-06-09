const dotenv = require('dotenv');
const { includes, isInteger, merge } = require('lodash');
const { getLogger } = require('log4js');
const { join: joinPath } = require('path');
const joinUrl = require('url-join');

const pkg = require('./package');

dotenv.config();

const logLevels = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ];
const root = __dirname;

const configFromEnvironment = {
  baseUrl: process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL,
  bcryptCost: parseEnvInt('BCRYPT_COST'),
  cors: parseEnvBoolean('CORS'),
  db: process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.MONGODB_URI || process.env.MONGODB_URL,
  dbName: process.env.DATABASE_NAME,
  docs: {
    browser: process.env.DOCS_BROWSER,
    open: parseEnvBoolean('DOCS_OPEN'),
    port: parseEnvInt('DOCS_PORT')
  },
  logLevel: process.env.LOG_LEVEL,
  port: parseEnvInt('PORT', false),
  secret: process.env.SECRET
};

const defaultConfig = {
  baseUrl: `http://localhost:${configFromEnvironment.port || 3000}`,
  bcryptCost: 10,
  db: 'mongodb://localhost/comem-travel-log-api',
  cors: false,
  docs: {
    open: true
  },
  logLevel: 'info',
  port: 3000
};

const fixedConfig = {
  logger: createLogger,
  path: (...paths) => joinPath(root, ...paths),
  root,
  version: pkg.version
};

const config = merge(defaultConfig, configFromEnvironment, fixedConfig);
config.joinUrl = (...segments) => joinUrl(config.baseUrl, ...segments);

if (!isInteger(config.bcryptCost)) {
  throw new Error(`Configuration property "bcryptCost" must be an integer, but its type is ${typeof config.bcryptCost}`);
} else if (config.bcryptCost < 1) {
  throw new Error(`Configuration property "bcryptCost" must be greater than or equal to 1, but its value is ${config.bcryptCost}`);
} else if (typeof config.dbName !== 'string') {
  throw new Error(`Configuration property "dbName" must be a string, but its type is ${typeof config.dbName}`);
} else if (typeof config.db !== 'string') {
  throw new Error(`Configuration property "db" must be a string, but its type is ${typeof config.db}`);
} else if (!config.db.match(/^mongodb(?:\+srv)?:\/\/[^\s]+$/)) {
  throw new Error(`Configuration property "db" must be a MongoDB URI starting with "mongodb://" or "mongodb+srv://, value "${config.db}" is not a valid MongoDB URI`);
} else if (typeof config.cors !== 'boolean') {
  throw new Error(`Configuration property "cors" must be a boolean, but its type is ${typeof config.cors}`);
} else if (config.docs.port !== undefined && typeof config.docs.port !== 'number') {
  throw new Error(`Configuration property "docs.port" must be a port number, but its type is ${typeof config.docs.port}`);
} else if (config.docs.port !== undefined && (!isInteger(config.docs.port) || config.docs.port < 0 || config.docs.port > 65535)) {
  throw new Error(`Configuration property "docs.port" must be a port number between 1 and 65535, but its value is ${config.docs.port}`);
} else if (typeof config.logLevel !== 'string') {
  throw new Error(`Configuration property "logLevel" must be a string, but its type is ${typeof config.logLevel}`);
} else if (!includes(logLevels, config.logLevel.toLowerCase())) {
  throw new Error(`Configuration property "logLevel" must be one of ${logLevels.join(', ')} (case-insensitive), but its value is "${config.logLevel}"`);
} else if (typeof config.port !== 'string' && typeof config.port !== 'number') {
  throw new Error(`Configuration property "port" must be a port number or a named pipe (string), but its type is ${typeof config.port}`);
} else if (typeof config.port === 'number' && (!isInteger(config.port) || config.port < 0 || config.port > 65535)) {
  throw new Error(`Configuration property "port" must be a port number between 1 and 65535, but its value is ${config.port}`);
} else if (config.secret !== undefined && typeof config.secret !== 'string') {
  throw new Error(`Configuration property "secret" must be a string, but its type is ${typeof config.secret}`);
} else if (!config.secret) {
  throw new Error('Configuration property "secret" is required; set the $SECRET environment variable');
}

function createLogger(name) {

  const logger = getLogger(name);
  logger.level = config.logLevel.toLowerCase();

  return logger;
}

function parseEnvBoolean(name) {
  const value = process.env[ name ];
  return value !== undefined ? Boolean(value.match(/^(?:1|y|yes|t|true)$/i)) : undefined;
}

function parseEnvInt(name, strict = true) {

  const value = process.env[ name ];
  if (value === undefined) {
    return;
  }

  const parsed = parseInt(value, 10);
  if (!isInteger(parsed) && strict) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsed;
}

module.exports = config;

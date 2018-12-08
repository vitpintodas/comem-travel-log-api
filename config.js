const dotenv = require('dotenv');
const { defaults, includes, isInteger } = require('lodash');
const { join: joinPath, resolve: resolvePath } = require('path');
const joinUrl = require('url-join');

const pkg = require('./package');

dotenv.config();

const root = resolvePath(joinPath(__dirname, '..'));

const configFromEnvironment = {
  baseUrl: process.env.BASE_URL,
  bcryptCost: parseEnvInt('BCRYPT_COST'),
  db: process.env.DATABASE_URL || process.env.MONGODB_URL,
  port: process.env.PORT,
  secret: process.env.SECRET
};

const defaultConfig = {
  baseUrl: `http://localhost:${configFromEnvironment.port || 3000}`,
  bcryptCost: 10,
  db: 'mongodb://localhost/comem-travel-log-api',
  port: 3000
};

const fixedConfig = {
  join: (...paths) => joinPath(root, ...paths),
  root,
  version: pkg.version
};

const config = defaults(fixedConfig, configFromEnvironment, defaultConfig);
config.joinUrl = (...segments) => joinUrl(config.baseUrl, ...segments);

if (typeof config.db !== 'string') {
  throw new Error(`Configuration property "db" must be a string, but its type is ${typeof config.db}`);
} else if (!config.db.match(/^mongodb:\/\/[^\s]+$/)) {
  throw new Error(`Configuration property "db" must be a MongoDB URI starting with "mongodb://", value "${config.db}" is not a valid MongoDB URI`);
} else if (!isInteger(config.bcryptCost)) {
  throw new Error(`Configuration property "bcryptCost" must be an integer, but its type is ${typeof config.bcryptCost}`);
} else if (config.bcryptCost < 1) {
  throw new Error(`Configuration property "bcryptCost" must be greater than or equal to 1, but its value is ${config.bcryptCost}`);
} else if (config.secret !== undefined && typeof config.secret !== 'string') {
  throw new Error(`Configuration property "secret" must be a string, but its type is ${typeof config.secret}`);
} else if (!config.secret) {
  throw new Error('Configuration property "secret" is required; set the $SECRET environment variable');
}

function parseEnvInt(name) {

  const value = process.env[name];
  if (value === undefined) {
    return;
  }

  const parsed = parseInt(value, 10);
  if (!isInteger(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsed;
}

module.exports = config;

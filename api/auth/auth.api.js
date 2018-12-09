const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../../config');
const User = require('../../models/user');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');

const authLogger = config.logger('api:auth');

exports.createAuthenticationToken = route(async (req, res) => {

  const missing = [];

  const username = req.body.username;
  if (!username) {
    missing.push('username');
  }

  const password = req.body.password;
  if (!password) {
    missing.push('password');
  }

  if (missing.length) {
    throw createError(401, 'authCredentialsMissing', 'Username or password is missing', {
      properties: { missing }
    });
  }

  const user = await User.findOne({ name: username });
  if (!user) {
    throw createError(401, 'authCredentialsUnknown', `There is no user named "${username}"`);
  }

  const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordIsValid) {
    throw createError(401, 'authCredentialsInvalid', 'Password is incorrect');
  }

  const token = await signJwt({
    exp: new Date().getTime() / 1000 + 2 * 7 * 24 * 60 * 60, // Valid 2 weeks
    sub: user.apiId
  });

  res.send({ token, user });

  authLogger.info(`Authenticated user ${user.apiId} named "${user.name}"`);
});

function signJwt(payload) {
  return new Promise((resolve, reject) => jwt.sign(payload, config.secret, (err, token) => err ? reject(err) : resolve(token)));
}

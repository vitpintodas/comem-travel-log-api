const bcrypt = require('bcrypt');
const { pick } = require('lodash');
const mongoose = require('mongoose');

const config = require('../config');
const { apiIdPlugin, hrefPlugin, parsePlugin, timestampsPlugin } = require('../utils/models');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
    minlength: 3,
    maxlength: 25,
    validate: {
      validator: validateNameAvailable,
      message: '{VALUE} is already taken'
    }
  },
  passwordHash: {
    type: String,
    default: null,
    validate: {
      validator: validatePassword
    }
  }
});

userSchema.plugin(apiIdPlugin);
userSchema.plugin(hrefPlugin);
userSchema.plugin(parsePlugin);
userSchema.plugin(timestampsPlugin);

userSchema.methods.setPassword = async function(password) {
  if (password) {
    this._password = password;
    this.passwordHash = await bcrypt.hash(password, config.bcryptCost);
  } else {
    delete this._password;
    delete this.passwordHash;
  }
};

userSchema.methods.toJSON = function() {
  return {
    id: this.apiId,
    ...pick(this, 'name', 'href', 'createdAt', 'updatedAt')
  };
};

userSchema.statics.apiResource = '/api/users';
userSchema.statics.editableProperties = [ 'name' ];

function validateNameAvailable(value) {
  return this.constructor.findOne({
    _id: {
      $ne: this._id
    },
    name: value ? value.toLowerCase() : value
  }).then(existingUser => !existingUser);
}

function validatePassword(value) {
  if (!value && !this._password) {
    this.invalidate('password', 'Path `password` is required', null, 'required');
  } else if (this._password && this._password.length < 4) {
    this.invalidate('password', 'Path `password` is shorter than the minimum allowed length (4)', null, 'minlength');
  }

  return true;
}

module.exports = mongoose.model('User', userSchema);

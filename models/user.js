const bcrypt = require('bcrypt');
const { pick } = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('../config');

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
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date
  },
  updatedAt: {
    type: Date,
    required: true,
    default: function() {
      return this.createdAt;
    }
  }
});

userSchema.set('toJSON', {
  transform: transformJson,
  virtuals: true
});

userSchema.methods.setPassword = async function(password) {
  this._password = password;
  this.passwordHash = await bcrypt.hash(password, config.bcryptCost);
};

userSchema.statics.parse = function(body) {
  return pick(body, 'name');
};

function transformJson(doc, json, options) {
  json.id = json._id;
  json.href = `/api/users/${json._id}`;
  delete json._id;
  delete json.__v;
  delete json.passwordHash;
}

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
    this.invalidate('password', 'Path `password` is shorter than the minimum allowed length (4).', null, 'minlength');
  }

  return true;
}

module.exports = mongoose.model('User', userSchema);

const bcrypt = require('bcrypt');
const { pick } = require('lodash');
const mongoose = require('mongoose');
const uuid = require('uuid/v4');

const config = require('../config');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  apiId: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    minlength: 36,
    maxlength: 36
  },
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

userSchema.virtual('href').get(function() {
  return `/api/users/${this.apiId}`;
});

userSchema.methods.setPassword = async function(password) {
  if (password) {
    this._password = password;
    this.passwordHash = await bcrypt.hash(password, config.bcryptCost);
  } else {
    delete this._password;
    delete this.passwordHash;
  }
};

userSchema.statics.parse = function(body) {
  return pick(body, 'name');
};

userSchema.set('toJSON', {
  transform: transformJson,
  virtuals: true
});

userSchema.pre('validate', function(next) {
  Promise.resolve().then(generateUniqueApiId.bind(this)).then(() => next(), next);
});

async function generateUniqueApiId() {

  let attempts = 0;
  do {

    const apiId = uuid();
    const existingUser = await this.constructor.findOne({ apiId });
    if (!existingUser) {
      return this.apiId = apiId;
    }

    attempts++;
  } while (attempts < 10);

  throw new Error(`Could not find a unique API ID after ${attempts} attempts`)
}

function transformJson(doc, json, options) {
  json.id = json.apiId;
  delete json._id;
  delete json.__v;
  delete json.apiId;
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

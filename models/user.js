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

userSchema.methods.parseFrom = function(body) {
  this.set(this.constructor.parse(body));
  return this;
};

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

userSchema.statics.parse = function(body) {
  return pick(body, 'name');
};

userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

userSchema.pre('validate', setUniqueApiId);

async function setUniqueApiId() {
  if (this.apiId) {
    return;
  }

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

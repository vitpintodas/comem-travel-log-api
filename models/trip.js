const { pick } = require('lodash');
const mongoose = require('mongoose');
const uniqueValidatorPlugin = require('mongoose-unique-validator');

const config = require('../config');
const { apiIdPlugin, hrefPlugin, parsePlugin, timestampsPlugin } = require('../utils/models');

const Schema = mongoose.Schema;

const tripSchema = new Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    uniqueValidator: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 50000
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: validateUserHref
    }
  }
});

tripSchema.plugin(apiIdPlugin);
tripSchema.plugin(hrefPlugin);
tripSchema.plugin(parsePlugin);
tripSchema.plugin(timestampsPlugin);
tripSchema.plugin(uniqueValidatorPlugin);

tripSchema.virtual('userId').get(getUserId);
tripSchema.virtual('userHref').get(getUserHref).set(setUserHref);

tripSchema.methods.toJSON = function() {
  return {
    id: this.apiId,
    ...pick(this, 'title', 'description', 'href', 'userId', 'userHref', 'createdAt', 'updatedAt')
  };
};

tripSchema.statics.apiResource = '/api/trips';
tripSchema.statics.editableProperties = [ 'title', 'description' ];

tripSchema.pre('validate', loadUserHref);

function getUserId() {
  if (!this.user || !this.user.apiId) {
    throw new Error('Trip user must have an "apiId" property; perhaps you forgot to populate');
  }

  return this.user.apiId;
}

function getUserHref() {
  if (!this.user || !this.user.href) {
    throw new Error('Trip user must have an "href" property; perhaps you forgot to populate');
  }

  return this.user.href;
}

async function loadUserHref() {
  if (this.user || !this._userHref) {
    return;
  }

  const user = await mongoose.model('User').findOne({ apiId: this._userHref });
  this.user = user ? user.id : null;
}

function setUserHref(href) {
  this._userHref = href;
}

async function validateUserHref(value) {
  if (!value && !this._userHref) {
    this.invalidate('userHref', 'Path `userHref` is required', null, 'required');
    return true;
  }

  const userId = value.id || value;
  const user = mongoose.Types.ObjectId.isValid(userId) ? await mongoose.model('User').findById(userId) : undefined;
  if (!user) {
    this.invalidate('userHref', 'Path `userHref` does not correspond to a known user', null, 'invalid reference');
  }

  return true;
}

module.exports = mongoose.model('Trip', tripSchema);

const bcrypt = require('bcrypt');
const { pick } = require('lodash');
const mongoose = require('mongoose');
const uniqueValidatorPlugin = require('mongoose-unique-validator');

const config = require('../config');
const { apiIdPlugin, hrefPlugin, parsePlugin, timestampsPlugin } = require('../utils/models');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uniqueValidator: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
    minlength: 3,
    maxlength: 25
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
userSchema.plugin(uniqueValidatorPlugin);

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
    ...pick(this, 'href', 'name', 'createdAt', 'updatedAt')
  };
};

userSchema.statics.apiResource = '/api/users';
userSchema.statics.editableProperties = [ 'name' ];

// Cascade delete
userSchema.pre('remove', async function() {

  // Find all related trips
  const Trip = mongoose.model('Trip');
  const trips = await Trip.find({ user: this.id }).select('_id');

  // Remove all related places
  const Place = mongoose.model('Place');
  await Place.remove({ trip: { $in: trips.map(trip => trip.id) } });

  // Remove all related trips
  await Trip.remove({ user: this.id });
});

function validatePassword(value) {
  if (!value && !this._password) {
    this.invalidate('password', 'Path `password` is required', null, 'required');
  } else if (this._password && this._password.length < 4) {
    this.invalidate('password', 'Path `password` is shorter than the minimum allowed length (4)', null, 'minlength');
  }

  return true;
}

module.exports = mongoose.model('User', userSchema);

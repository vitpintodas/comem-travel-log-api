const { pick } = require('lodash');
const mongoose = require('mongoose');
const uniqueValidatorPlugin = require('mongoose-unique-validator');

const config = require('../config');
const { apiIdPlugin, hrefPlugin, parsePlugin, relatedHrefPluginFactory, timestampsPlugin } = require('../utils/models');

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
  }
});

tripSchema.plugin(apiIdPlugin);
tripSchema.plugin(hrefPlugin);
tripSchema.plugin(parsePlugin);
tripSchema.plugin(relatedHrefPluginFactory('User'));
tripSchema.plugin(timestampsPlugin);
tripSchema.plugin(uniqueValidatorPlugin);

tripSchema.methods.toJSON = function() {
  return {
    id: this.apiId,
    ...pick(this, 'href', 'title', 'description', 'userId', 'userHref', 'createdAt', 'updatedAt')
  };
};

tripSchema.statics.apiResource = '/api/trips';
tripSchema.statics.editableProperties = [ 'title', 'description' ];

// Cascade delete
tripSchema.pre('remove', async function() {
  const Place = mongoose.model('Place');
  await Place.remove({ trip: this.id });
});

module.exports = mongoose.model('Trip', tripSchema);

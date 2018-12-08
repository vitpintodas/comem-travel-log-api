const { isArray, pick } = require('lodash');
const joinUrl = require('url-join');
const uuid = require('uuid/v4');

exports.apiIdPlugin = function(schema) {

  schema.add({
    apiId: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      minlength: 36,
      maxlength: 36
    }
  });

  schema.pre('validate', async function() {
    if (!this.apiId) {
      this.apiId = await generateUniqueApiId(this.constructor);
    }
  });
}

exports.hrefPlugin = function(schema) {
  schema.virtual('href').get(function() {
    if (!this.apiId) {
      throw new Error('Document must have an "apiId" property to use the href plugin');
    }

    const apiResource = this.constructor.apiResource;
    if (!apiResource) {
      throw new Error('Model must have an "apiResource" property to use the href plugin');
    } else if (typeof apiResource !== 'string') {
      throw new Error(`Model property "apiResource" must be a string, but its type is ${typeof apiResource}`)
    }

    return joinUrl(apiResource, this.apiId);
  });
};

exports.parsePlugin = function(schema) {

  schema.methods.parseFrom = function(body) {
    this.set(this.constructor.parse(body));
    return this;
  };

  schema.statics.parse = function(body) {

    const editableProperties = this.editableProperties || [];
    if (!isArray(editableProperties)) {
      throw new Error(`Model property "editableProperties" must be an array, but its type is ${typeof editableProperties}`);
    } else if (editableProperties.some(property => typeof property !== 'string')) {
      throw new Error('Model property "editableProperties" must be an array of strings, but some of its elements are not strings');
    }

    return pick(body, ...editableProperties);
  };
};

exports.timestampsPlugin = function(schema) {

  schema.add({
    createdAt: {
      type: Date
    },
    updatedAt: {
      type: Date
    }
  });

  schema.pre('save', function(next) {
    if (!this.createdAt) {
      this.createdAt = new Date();
    }

    if (!this.updatedAt) {
      this.updatedAt = this.createdAt;
    } else if (!this.isNew) {
      this.updatedAt = new Date();
    }

    next();
  });
}

async function generateUniqueApiId(model) {

  let attempts = 0;
  do {

    const apiId = uuid();
    const existingRecord = await model.findOne({ apiId });
    if (!existingRecord) {
      return apiId;
    }

    attempts++;
  } while (attempts < 10);

  throw new Error(`Could not find a unique API ID after ${attempts} attempts`)
}

const { camelize, humanize } = require('inflection');
const { get, isArray, pick } = require('lodash');
const mongoose = require('mongoose');
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

exports.relatedHrefPluginFactory = (ref, options) => function(schema) {

  const modelName = get(options, 'modelName', ref);
  const humanModelName = get(options, 'humanModelName');
  const property = get(options, 'property', camelize(ref, true));
  const hiddenIdProperty = get(options, 'hiddenIdProperty', `_${property}Id`);
  const virtualHrefProperty = get(options, 'virtualHrefProperty', `${property}Href`);
  const virtualIdProperty = get(options, 'virtualIdProperty', `${property}Id`);

  schema.add({
    [property]: {
      type: mongoose.Schema.Types.ObjectId,
      ref,
      default: null,
      validate: {
        validator: validateRelatedHref
      }
    }
  });

  schema.virtual(virtualIdProperty).get(getRelatedId).set(setRelatedId);
  schema.virtual(virtualHrefProperty).get(getRelatedHref).set(setRelatedHref);

  schema.pre('validate', loadRelatedHref);

  function getHumanModelName() {
    return humanModelName || humanize(mongoose.model(ref).modelName, true);
  }

  function getRelatedHref() {
    if (!this[property] || !this[property].href) {
      throw new Error(`${this.constructor.modelName} ${getHumanModelName()} must have an "href" property; perhaps you forgot to populate`);
    }

    return this[property].href;
  }

  function getRelatedId() {
    if (!this[property] || !this[property].apiId) {
      throw new Error(`${this.constructor.modelName} ${getHumanModelName()} must have an "apiId" property; perhaps you forgot to populate`);
    }

    return this[property].apiId;
  }

  async function loadRelatedHref() {
    if (this[property] || !this[hiddenIdProperty]) {
      return;
    }

    const related = await mongoose.model(ref).findOne({ apiId: this[hiddenIdProperty] });
    this[property] = related ? related.id : null;
  }

  function setRelatedHref(href) {

    const modelName = mongoose.model(ref).modelName;
    const apiResource = mongoose.model(ref).apiResource;
    if (!apiResource) {
      throw new Error(`${this.constructor.name} related model ${modelName} must have an "apiResource" property`);
    }

    this[hiddenIdProperty] = typeof href === 'string' && href.indexOf(`${apiResource}/`) === 0 ? href.slice(apiResource.length + 1) : null;
  }

  function setRelatedId(id) {
    this[hiddenIdProperty] = id;
  }

  async function validateRelatedHref(value) {
    if (!value && !this[hiddenIdProperty]) {
      this.invalidate(virtualHrefProperty, `Path \`${virtualHrefProperty}\` is required`, null, 'required');
      return true;
    }

    const relatedModel = mongoose.model(modelName);
    const relatedId = value instanceof mongoose.Types.ObjectId ? value : (value.id || value);

    const related = mongoose.Types.ObjectId.isValid(relatedId) ? await relatedModel.findById(relatedId) : undefined;
    if (!related) {
      this.invalidate(virtualHrefProperty, `Path \`${virtualHrefProperty}\` does not correspond to a known ${getHumanModelName()}`, null, 'invalid reference');
    }

    return true;
  }
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

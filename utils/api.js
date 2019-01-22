const formatLinkHeader = require('format-link-header');
const { camelize, pluralize } = require('inflection');
const { compact, get, includes, isArray, isEmpty, isInteger, isObject, isPlainObject, keys, reduce, uniqBy, without } = require('lodash');
const mongoose = require('mongoose');
const { stringify: stringifyQuery } = require('qs');
const { parse: parseUrl } = require('url');

const config = require('../config');
const { createError } = require('./errors');

async function paginate(req, res, model, pipeline, filtersFactory) {

  const apiResource = model.apiResource;
  if (!apiResource) {
    throw new Error(`Model must have an "apiResource" property`);
  }

  ensureSingleQueryParam(req, 'page');
  ensureSingleQueryParam(req, 'pageSize');

  // Parse the "page" URL query parameter indicating the index of the first element
  const page = getPaginationQueryParameter(req.query.page, 1);
  if (!isInteger(page) || page < 1) {
    throw invalidQueryParamError('page', `Query parameter "page" must be an integer greater than or equal to 1, but its value is "${req.query.page}"`);
  }

  // Parse the "pageSize" URL query parameter indicating the number of elements to load
  const pageSize = getPaginationQueryParameter(req.query.pageSize, 10);
  if (!isInteger(pageSize) || pageSize < 0 || pageSize >= 50) {
    throw invalidQueryParamError('pageSize', `Query parameter "pageSize" must be an integer greater than or equal to 0 and less than or equal to 50, but its value is "${req.query.pageSize}"`);
  }

  const filters = await filtersFactory(req);
  if (!isArray(filters)) {
    throw new Error('Filters factory must return an array of aggregation pipeline stages');
  }

  // Count the number of unfiltered and filtered elements
  const { total, filteredTotal } = await countTotals(model, pipeline, filters);

  const links = {};
  const maxPage = Math.ceil(filteredTotal / pageSize);

  addLink(links, 'self', req, apiResource, page, pageSize);
  addLink(links, 'first', req, apiResource, 1, pageSize);
  addLink(links, 'last', req, apiResource, maxPage, pageSize);

  // Add first & prev links if current page is not the first one
  if (page > 1 && pageSize !== 0) {
    addLink(links, 'prev', req, apiResource, page - 1, pageSize);
  }

  // Add next & last links if current page is not the last one
  if (page < maxPage && pageSize !== 0) {
    addLink(links, 'next', req, apiResource, page + 1, pageSize);
  }

  // Add the Link header to the response
  res.set('Link', formatLinkHeader(links));

  // Also add custom header to indicate the totals to the client
  res.set('Pagination-Page', page);
  res.set('Pagination-Page-Size', pageSize);
  res.set('Pagination-Total', total);
  res.set('Pagination-Filtered-Total', filteredTotal);

  const pagination = [
    { $skip: page - 1 },
    { $limit: pageSize }
  ];

  // Returned the filtered and paginated pipeline
  return [ ...pipeline, ...filters, ...pagination ];
}

function sortPipelineFactory(options = {}) {

  const allowed = get(options, 'allowed', []);
  const defaultSort = get(options, 'default');
  const requiredSort = get(options, 'required', '-createdAt');

  const config = allowed.reduce((memo, definition) => {
    if (typeof definition === 'string') {
      memo[definition] = definition;
    } else if (isPlainObject(definition)) {
      for (const sortName in definition) {
        const sortValue = definition[sortName];
        if (typeof sortValue === 'string') {
          memo[sortName] = sortValue;
        } else {
          throw new Error(`Sort definition object must have string values, but one value has type ${typeof sortValue}`);
        }
      }
    } else {
      throw new Error(`Sort definition must be a string or a plain object, but its type is ${typeof definition}`);
    }

    return memo;
  }, {});

  return (req, pipeline) => {

    const sortStage = {
      $sort: {}
    };

    const querySorts = toArray(req.query.sort);
    if (!querySorts.length && defaultSort) {
      querySorts.push(defaultSort);
    }

    const unknownSorts = querySorts.map(value => String(value).replace(/^-/, '')).filter(value => !config[value]);
    if (unknownSorts.length) {
      throw invalidQueryParamError('sort', `Query parameter "sort" contains the following unknown sort parameters: ${unknownSorts.map(value => `"${value}"`).join(', ')}`);
    }

    const sortsToApply = uniqBy(compact([ ...querySorts, requiredSort ]), value => String(value).replace(/^-/, ''));
    for (const sort of sortsToApply) {
      sortStage.$sort[config[sort.replace(/^-/, '')]] = sort.match(/^-/) ? -1 : 1;
    }

    return isEmpty(sortStage.$sort) ? pipeline : [ ...pipeline, sortStage ];
  };
}

function addLink(links, rel, req, apiResource, page, pageSize) {
  links[rel] = {
    rel,
    url: buildPaginationUrl(req, apiResource, page, pageSize)
  };
}

function buildPaginationUrl(req, apiResource, page, pageSize) {

  const query = {
    ...req.query,
    page,
    pageSize
  };

  return config.joinUrl(`${parseUrl(req.originalUrl).pathname}?${stringifyQuery(query)}`);
}

function addRelatedPropertyPipelineFactory(model, relatedModelName, properties, options = {}) {

  properties = toArray(properties);
  const collection = get(options, 'collection', mongoose.model(relatedModelName).collection.name);
  const localField = get(options, 'localField', camelize(relatedModelName, true));
  const foreignField = get(options, 'foreignField', '_id');
  const as = get(options, 'as', `${camelize(relatedModelName, true)}Properties`);

  return [
    {
      $lookup: {
        from: collection,
        localField: localField,
        foreignField,
        as
      }
    },
    {
      $unwind: {
        path: `$${as}`,
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            '$$ROOT',
            {
              [as]: reduce(properties, (memo, property) => ({
                ...memo,
                [property]: `$${as}.${property}`
              }), {})
            }
          ]
        }
      }
    }
  ];
}

function countRelatedPipelineFactory(model, relatedModelName, options = {}) {

  const collection = get(options, 'collection', mongoose.model(relatedModelName).collection.name);
  const foreignField = get(options, 'foreignField', camelize(model.modelName, true));
  const countField = get(options, 'countField', `${pluralize(camelize(relatedModelName, true))}Count`);
  const idsField = get(options, 'countField', `${pluralize(camelize(relatedModelName, true))}Ids`);

  return [
    {
      $lookup: {
        from: collection,
        localField: '_id',
        foreignField,
        as: collection
      }
    },
    {
      $unwind: {
        path: `$${collection}`,
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: '$_id',
        ...groupModelProperties(model),
        [idsField]: {
          $push: `$${collection}._id`
        }
      }
    },
    {
      $addFields: {
        [countField]: {
          $size: `$${idsField}`
        }
      }
    },
    {
      $project: {
        [idsField]: 0
      }
    }
  ];
}

async function countTotals(model, pipeline, filters) {

  const [ totalResult, filteredTotalResult ] = await Promise.all([
    model.aggregate([ ...pipeline, { $count: 'total' } ]),
    filters.length ? model.aggregate([ ...pipeline, ...filters, { $count: 'total' } ]) : undefined
  ]);

  const total = get(totalResult, '0.total', 0);

  return {
    total,
    filteredTotal: get(filteredTotalResult, '0.total', total)
  };
}

function ensureSingleQueryParam(req, queryParam) {
  if (isArray(req.query[queryParam])) {
    throw invalidQueryParamError(queryParam, `Query parameter "${queryParam}" must only be specified once`);
  }
}

function getPaginationQueryParameter(value, defaultValue) {
  return value !== undefined ? parseInt(value, 10) : defaultValue;
}

function groupModelProperties(model) {
  const modelProperties = keys(model.schema.paths);
  return without(modelProperties, '_id').reduce((memo, property) => ({ ...memo, [property]: { $first: `$${property}` } }), {});
}

function invalidQueryParamError(queryParam, message) {
  return createError(400, 'invalidQueryParam', message, {
    properties: { queryParam }
  });
}

function prepareDatabaseQuery(query, pageSize) {
  return pageSize === 0 ? query.where({ _id: null }) : query;
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return next(createError(415, 'wrongRequestFormat', `This resource only has an application/json representation, but the content type of the request is ${req.get('Content-Type') || 'not specified'}`));
  } else if (!isObject(req.body)) {
    return next(createError(400, 'invalidRequestBody', 'The request body must be a JSON object'));
  }

  next();
}

function toArray(value) {
  if (value === undefined) {
    return [];
  }

  return isArray(value) ? value : [ value ];
}

function includeRequested(req, value, context) {
  return req && req.query && includes(toArray(req.query.include), compact([ context, value ]).join('.'));
}

module.exports = { addRelatedPropertyPipelineFactory, countRelatedPipelineFactory, ensureSingleQueryParam, includeRequested, invalidQueryParamError, paginate, requireJson, sortPipelineFactory, toArray };

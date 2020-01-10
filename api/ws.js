const { capitalize } = require('inflection');
const WebSocket = require('ws');

const Place = require('../models/place');
const Trip = require('../models/trip');
const User = require('../models/user');
const config = require('../config');

const wsLogger = config.logger('ws');

let wss;
const wsClients = [];

exports.createServer = function(server) {
  wss = new WebSocket.Server({ server });
  wsLogger.debug('Created WebSocket server');

  wss.on('connection', function connection(ws, req) {
    wsClients.push(ws);
    wsLogger.info(`WebSocket client has connected from ${req.connection.remoteAddress}`);

    ws.send('hello');

    ws.on('close', (code, reason) => {
      wsClients.splice(wsClients.indexOf(ws), 1);
      wsLogger.debug(`WebSocket client has disconnected (code ${code}, reason: ${reason || 'none'})`);
    })
  });
};

exports.onResourceCreated = function(createdResource) {
  Promise
    .resolve()
    .then(() => computeAndSendStats(createdResource, 'created'))
    .catch(err => wsLogger.warn(err.stack));
};

exports.onResourceRemoved = function(removedResource) {
  Promise
    .resolve()
    .then(() => computeAndSendStats(removedResource, 'removed'))
    .catch(err => wsLogger.warn(err.stack));
};

async function computeAndSendStats(resource, action) {
  if (!wsClients.length) {
    return;
  }

  const [ placesCount, tripsCount, usersCount ] = await Promise.all([
    Place.count(),
    Trip.count(),
    User.count()
  ]);

  const message = {
    stats: {
      placesCount, tripsCount, usersCount,
      computedAt: new Date()
    }
  };

  switch (resource.constructor) {
    case Place:
      message.type = `place${capitalize(action)}`;
      message.place = resource;
      break;
    case Trip:
      message.type = `trip${capitalize(action)}`;
      message.trip = resource;
      break;
    case User:
      message.type = `user${capitalize(action)}`;
      message.user = resource;
      break;
    default:
      message.type = 'stats';
  }

  for (ws of wsClients) {
    ws.send(JSON.stringify(message));
  }
}
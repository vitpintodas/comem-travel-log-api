const WebSocket = require('ws');

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
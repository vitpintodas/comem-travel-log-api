const getPort = require('get-port');
const liveServer = require('live-server');

const config = require('../config');

const logger = config.logger('docs');

Promise
  .resolve()
  .then(getDocsPort)
  .then(serveDocs)
  .catch(err => logger.fatal(err));

function getDocsPort() {
  return config.docs.port ? config.docs.port : getPort();
}

function serveDocs(port) {

  const liveServerConfig = {
    browser: config.docs.browser,
    file: 'index.html',
    host: config.docs.host,
    open: config.docs.open,
    port: port,
    root: config.path('docs'),
    wait: 50
  };

  liveServer.start(liveServerConfig);
}


'use strict'

const HTTPProxy = require('./lib/httpproxy')

const httpProxy = new HTTPProxy()

httpProxy.on('error', err => {
  console.error(err)
  process.exit(1)
})

httpProxy.start()
  .then(() => console.log('HTTP Proxy started!'))

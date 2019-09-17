#!/usr/bin/env node

'use strict'

const HTTPProxy = require('./lib/proxy')

const proxy = new HTTPProxy()

proxy.on('error', err => {
  console.error(err)
  process.exit(1)
})

proxy.start()
  .then(() => console.log('HTTP Proxy started!'))

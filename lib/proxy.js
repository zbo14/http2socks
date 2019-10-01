'use strict'

const http = require('http')
const Pipe = require('./pipe')

/**
 * An HTTP proxy that routes traffic through a SOCKS4(a) proxy.
 *
 * @extends http.Server
 */
class HTTPProxy extends http.Server {
  constructor () {
    super()

    this.on('connect', this.handleConnect.bind(this))
  }

  async handleConnect (req, httpConn, head) {
    const pipe = new Pipe(httpConn)

    this.emit('pipe', pipe)

    const [ host, port ] = req.url.split(':')

    try {
      await pipe.connect(host, +port, this.socksHost, this.socksPort)

      await Promise.all([
        pipe.writeHTTP('HTTP/1.1 200 Connection Established\r\n\r\n'),
        pipe.writeSOCKS(head)
      ])
    } catch (_) {
      pipe.handleEnd()
    }
  }

  /**
   * Start the HTTP proxy.
   *
   * @param  {Object} [opts = {}]
   * @param  {Number} [opts.httpPort  = process.env.HTTP_PORT]  - the port the HTTP proxy should listen on
   * @param  {String} [opts.socksHost = process.env.SOCKS_HOST] - the SOCKS proxy hostname
   * @param  {Number} [opts.socksPort = process.env.SOCKS_PORT] - the port the SOCKS proxy is listening on
   *
   * @return {Promise}
   */
  start ({
    httpPort = process.env.HTTP_PORT,
    socksPort = process.env.SOCKS_PORT,
    socksHost = process.env.SOCKS_HOST
  } = {}) {
    this.socksHost = socksHost
    this.socksPort = +socksPort

    return new Promise((resolve, reject) => {
      this.once('error', reject)
      this.listen(httpPort, '127.0.0.1', resolve)
    })
  }

  /**
   * Stop the HTTP proxy.
   *
   * @return {Promise}
   */
  stop () {
    return new Promise((resolve, reject) => {
      this.close(err => err ? reject(err) : resolve())
    })
  }
}

module.exports = HTTPProxy

'use strict'

const net = require('net')

const BUFFER_SIZE = 8

/**
 * A Client class that communicates with a SOCKS4(a) proxy.
 */
class SOCKSClient {
  constructor () {
    this.buf = Buffer.alloc(BUFFER_SIZE)
    this.conn = null
    this.idx = 0
  }

  /**
   * Connect to a remote host through a SOCKS proxy.
   *
   * @param  {String}  host      - the remote hostname
   * @param  {Number}  port      - the remote port
   * @param  {String}  socksHost - the SOCKS proxy hostname
   * @param  {Number}  socksPort - the port the SOCKS proxy is listening on
   *
   * @return {Promise}
   */
  async connect (host, port, socksHost, socksPort) {
    const handler = this.handleData.bind(this)

    await new Promise((resolve, reject) => {
      this.conn = net.connect(socksPort, socksHost, resolve)
      this.conn.once('error', reject)
      this.conn.on('data', handler)
    })

    await Promise.all([ this.readResponse(), this.writeRequest(port, host) ])

    this.conn.removeListener('data', handler)

    return this.conn
  }

  handleData (chunk) {
    if (this.idx + chunk.byteLength > BUFFER_SIZE) {
      return this.conn.destroy(new Error('Buffer overflow'))
    }

    chunk.copy(this.buf, this.idx)
    this.idx += chunk.byteLength
    this.conn.emit('buffer')
  }

  async readResponse () {
    while (this.idx < BUFFER_SIZE) {
      await this.wait()
    }

    if (this.buf[0]) {
      throw new Error('Expected null byte, got ' + this.buf[0])
    }

    if (this.buf[1] !== 0x5a) {
      throw new Error('Request rejected or failed')
    }

    const port = this.buf.slice(2, 4).readUInt16BE()
    const host = this.buf.slice(4).join('.')

    return { host, port }
  }

  writeRequest (port, host) {
    const buf = Buffer.alloc(2)
    buf.writeUInt16BE(port)

    const addr = host.split('.').map(Number)
    const arr = [ 0x4, 0x1, ...buf ]

    if (addr.length !== 4 || addr.includes(NaN)) {
      arr.push(0, 0, 0, 1, 0x0, ...Buffer.from(host), 0x0)
    } else {
      arr.push(...addr, 0x0)
    }

    const data = Buffer.from(arr)

    return this.write(data)
  }

  wait (ms = 10e3) {
    const timeout = setTimeout(() => {
      this.conn.destroy(new Error('Timeout'))
    }, ms)

    return new Promise((resolve, reject) => {
      this.conn.once('error', err => {
        clearTimeout(timeout)
        reject(err)
      })

      this.conn.once('buffer', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  write (data) {
    return new Promise((resolve, reject) => {
      this.conn.once('error', reject)
      this.conn.write(data, resolve)
    })
  }
}

module.exports = SOCKSClient

'use strict'

const net = require('net')

const BUFFER_SIZE = 8

/**
 * This class establishes a connection to a SOCKS4(a) proxy and pipes it to
 * an existing connection from an HTTP CONNECT request.
 */
class Pipe {
  constructor (httpConn) {
    this.buf = Buffer.alloc(BUFFER_SIZE)
    this.ended = false
    this.httpConn = httpConn
    this.idx = 0
    this.socksConn = null

    const handleEnd = this.handleEnd.bind(this, { socks: true })

    this.httpConn
      .on('close', handleEnd)
      .on('end', handleEnd)
      .on('error', console.error)
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
    const handleData = this.handleData.bind(this)
    const handleEnd = this.handleEnd.bind(this, { http: true })

    await new Promise((resolve, reject) => {
      this.socksConn = net.connect(socksPort, socksHost, resolve)
        .on('close', handleEnd)
        .on('end', handleEnd)
        .on('data', handleData)
        .on('error', err => {
          reject(err)
          console.error(err)
        })
    })

    const [ result ] = await Promise.all([
      this.readResponse(),
      this.writeRequest(port, host)
    ])

    this.socksConn
      .removeListener('data', handleData)
      .pipe(this.httpConn)
      .pipe(this.socksConn)

    return result
  }

  handleData (chunk) {
    if (this.idx + chunk.byteLength > BUFFER_SIZE) {
      return this.end()
    }

    chunk.copy(this.buf, this.idx)
    this.idx += chunk.byteLength
    this.socksConn.emit('buffer')
  }

  handleEnd ({ http = false, socks = false } = { http: true, socks: true }) {
    if (this.ended) return
    this.ended = true
    http && this.httpConn.end()
    socks && this.socksConn && this.socksConn.end()
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

    return this.writeSOCKS(data)
  }

  wait (ms = 60e3) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), ms)

      this.socksConn.once('error', err => {
        clearTimeout(timeout)
        reject(err)
      })

      this.socksConn.once('buffer', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  writeHTTP (data) {
    return new Promise((resolve, reject) => {
      this.httpConn
        .once('error', reject)
        .write(data, resolve)
    })
  }

  writeSOCKS (data) {
    return new Promise((resolve, reject) => {
      this.socksConn
        .once('error', reject)
        .write(data, resolve)
    })
  }
}

module.exports = Pipe

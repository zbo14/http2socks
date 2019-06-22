'use strict'

const assert = require('assert')
const http = require('http')
const net = require('net')
const HTTPProxy = require('../lib/httpproxy')

const socksPort = 10545
const httpPort = 10546

const connect = () => {
  const req = http.request({
    host: '0.0.0.0',
    port: httpPort,
    method: 'CONNECT',
    path: 'foobar.com:443'
  })

  return new Promise((resolve, reject) => {
    req.on('connect', (res, conn) => {
      res.on('data', () => {})
      res.on('end', () => resolve({ code: res.statusCode, conn }))
      res.on('error', reject)
    })

    req.on('error', reject).end()
  })
}

describe('lib/http-proxy', () => {
  describe('#handleConnect()', () => {
    beforeEach(async () => {
      this.proxy = new HTTPProxy()
      this.server = net.createServer()

      await Promise.all([
        this.proxy.start({ httpPort, socksPort }),
        new Promise(resolve => this.server.listen(socksPort, '0.0.0.0', resolve))
      ])
    })

    afterEach(() => {
      this.proxy.stop()
      this.server.close()
    })

    it('handles connect request', async () => {
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.server.once('connection', conn => {
        conn.write(buf)
        this.conn = conn
      })

      const { code, conn } = await connect()

      assert.strictEqual(code, 200)

      const promise = new Promise((resolve, reject) => {
        this.conn.once('data', () => this.conn.once('data', resolve))
        conn.once('error', reject)
        this.conn.once('error', reject)
        conn.write('foo')
      })

      assert.deepStrictEqual(await promise, Buffer.from('foo'))
    })

    it('handles connect request, ends SOCKS connection after client ends HTTP connection', async () => {
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.server.once('connection', conn => {
        conn.on('data', () => {}).write(buf)
        this.conn = conn
      })

      const { code, conn } = await connect()

      assert.strictEqual(code, 200)

      const promise = new Promise(resolve => this.conn.once('end', resolve))

      conn.end()

      await promise
    })

    it('handles connect request, ends SOCKS connection after client destroys HTTP connection', async () => {
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.server.once('connection', conn => {
        conn.on('data', () => {}).write(buf)
        this.conn = conn
      })

      const { code, conn } = await connect()

      assert.strictEqual(code, 200)

      const promise = new Promise(resolve => this.conn.once('end', resolve))

      conn.once('error', () => {}).destroy(new Error('whoops'))

      await promise
    })

    it('handles connect request, ends HTTP connection after server ends SOCKS connection', async () => {
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.server.once('connection', conn => {
        conn.on('data', () => {}).write(buf)
        this.conn = conn
      })

      const { code, conn } = await connect()

      assert.strictEqual(code, 200)

      const promise = new Promise(resolve => conn.once('end', resolve))

      this.conn.end()

      await promise
    })

    it('handles connect request, ends HTTP connection after server destroys SOCKS connection', async () => {
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.server.once('connection', conn => {
        conn.on('data', () => {}).write(buf)
        this.conn = conn
      })

      const { code, conn } = await connect()

      assert.strictEqual(code, 200)

      const promise = new Promise(resolve => conn.once('end', resolve))

      this.conn.once('error', () => {}).destroy(new Error('whoops'))

      await promise
    })

    it('handles error', async () => {
      const buf = Buffer.from([ 0x0, 0x5b, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ])
      this.server.once('connection', conn => conn.write(buf))
      const { code } = await connect()
      assert.deepStrictEqual(code, 500)
    })
  })

  describe('#start()', () => {
    beforeEach(() => {
      this.proxy = new HTTPProxy()
    })

    afterEach(async () => {
      await this.proxy.stop()
      delete process.env.HTTP_PORT
      delete process.env.SOCKS_PORT
    })

    it('starts with default httpPort', async () => {
      process.env.HTTP_PORT = 12346

      await this.proxy.start({ socksPort })

      const { port } = this.proxy.address()
      assert.strictEqual(port, 12346)
    })

    it('starts with default socksPort', async () => {
      process.env.SOCKS_PORT = 12346

      await this.proxy.start({ httpPort })

      assert.strictEqual(this.proxy.socksPort, 12346)
    })

    it('starts with default opts', async () => {
      process.env.SOCKS_PORT = 12346
      process.env.HTTP_PORT = 12347

      await this.proxy.start()

      const { port } = this.proxy.address()

      assert.strictEqual(this.proxy.socksPort, 12346)
      assert.strictEqual(port, 12347)
    })
  })

  describe('#stop()', () => {
    it('mocks error', async () => {
      const close = this.proxy.close
      this.proxy.close = cb => cb(new Error('whoops'))

      try {
        await this.proxy.stop()
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'whoops')
      }

      this.proxy.close = close
    })
  })
})

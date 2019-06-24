'use strict'

const assert = require('assert')
const { Duplex } = require('stream')
const lolex = require('lolex')
const net = require('net')
const Pipe = require('../lib/pipe')

const createConn = () => {
  const arr = []

  return new Duplex({
    read (size) {
      this.push(arr.shift())
    },

    write (chunk, encoding, cb) {
      arr.push(Buffer.from(chunk, encoding))
      cb()
    }
  })
}

const socksHost = '127.0.0.1'
const socksPort = 10459

describe('lib/socks-client', () => {
  beforeEach(done => {
    const httpConn = createConn()
    this.pipe = new Pipe(httpConn)
    this.pipe.socksConn = createConn()
    this.clock = lolex.install()
    this.server = net.createServer()
    this.server.listen(socksPort, '127.0.0.1', done)
  })

  afterEach(() => {
    this.clock.uninstall()
    this.server.close()
  })

  describe('#connect()', () => {
    it('mocks connection error', async () => {
      const promise = this.pipe.connect('foobar.com', 443, socksHost, socksPort)
      this.pipe.socksConn.emit('error', new Error('whoops'))

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'whoops')
      }
    })

    it('connects', async () => {
      const promise = this.pipe.connect('foobar.com', 443, socksHost, socksPort)

      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.pipe.socksConn.emit('data', buf)

      const result = await promise

      assert.deepStrictEqual(result, { host: '1.2.3.4', port: 443 })
    })
  })

  describe('#handleData()', () => {
    it('overflows buffer', async () => {
      const promise = new Promise(resolve => {
        this.pipe.end = resolve
      })

      this.pipe.handleData(Buffer.alloc(9))

      await promise
    })
  })

  describe('#readResponse()', () => {
    it('throws when it doesn\'t get null byte', async () => {
      const promise = this.pipe.readResponse()

      const buf = Buffer.alloc(8)
      buf[0] = 0x1

      this.pipe.socksConn.on('data', chunk => this.pipe.handleData(chunk))
      this.pipe.socksConn.emit('data', buf)

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'Expected null byte, got 1')
      }
    })

    it('throws when request rejected or failed', async () => {
      const promise = this.pipe.readResponse()

      const buf = Buffer.alloc(8)
      buf[1] = 0x5b

      this.pipe.socksConn.on('data', chunk => this.pipe.handleData(chunk))
      this.pipe.socksConn.emit('data', buf)

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'Request rejected or failed')
      }
    })

    it('throws on timeout', async () => {
      const promise = this.pipe.readResponse()

      this.clock.tick(60e3)

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'Timeout')
      }
    })

    it('throws on error during wait', async () => {
      const promise = this.pipe.readResponse()

      this.pipe.socksConn.emit('error', new Error('whoops'))

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'whoops')
      }
    })

    it('reads response', async () => {
      const promise = this.pipe.readResponse()
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.pipe.socksConn.on('data', chunk => this.pipe.handleData(chunk))
      this.pipe.socksConn.emit('data', buf)

      const result = await promise

      assert.deepStrictEqual(result, { host: '1.2.3.4', port: 443 })
    })
  })

  describe('#writeRequest()', () => {
    it('writes request for IP address', async () => {
      this.pipe.writeSOCKS = x => x

      const result = await this.pipe.writeRequest(443, '1.2.3.4')

      assert.deepStrictEqual(result,
        Buffer.from([ 0x4, 0x1, 0x1, 0xbb, 0x1, 0x2, 0x3, 0x4, 0x0 ])
      )
    })

    it('writes request for domain name', async () => {
      this.pipe.writeSOCKS = x => x

      const result = await this.pipe.writeRequest(443, 'foobar.com')

      assert.deepStrictEqual(result,
        Buffer.from([ 0x4, 0x1, 0x1, 0xbb, 0x0, 0x0, 0x0, 0x1, 0x0, ...Buffer.from('foobar.com'), 0x0 ])
      )
    })
  })
})

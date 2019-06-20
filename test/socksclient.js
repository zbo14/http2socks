'use strict'

const assert = require('assert')
const EventEmitter = require('events')
const lolex = require('lolex')
const net = require('net')
const SOCKSClient = require('../lib/socksclient')

const socksHost = '0.0.0.0'
const socksPort = 10459

describe('lib/socks-client', () => {
  beforeEach(done => {
    this.client = new SOCKSClient()
    this.client.sock = new EventEmitter()
    this.clock = lolex.install()
    this.server = net.createServer()
    this.server.listen(socksPort, '0.0.0.0', done)
  })

  afterEach(() => {
    this.clock.uninstall()
    this.server.close()
  })

  describe('#connect()', () => {
    it('mocks connection error', async () => {
      const promise = this.client.connect('foobar.com', 443, socksHost, socksPort)
      this.client.sock.emit('error', new Error('whoops'))

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'whoops')
      }
    })

    it('connects', async () => {
      const promise = this.client.connect('foobar.com', 443, socksHost, socksPort)

      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.client.sock.emit('data', buf)

      assert.deepStrictEqual(await promise, { port: 443, host: '1.2.3.4' })
    })
  })

  describe('#handleData()', () => {
    it('overflows buffer', async () => {
      const promise = new Promise(resolve => {
        this.client.sock.destroy = resolve
      })

      this.client.handleData(Buffer.alloc(9))

      const { message } = await promise
      assert.strictEqual(message, 'Buffer overflow')
    })
  })

  describe('#readResponse()', () => {
    it('throws when it doesn\'t get null byte', async () => {
      const promise = this.client.readResponse()

      const buf = Buffer.alloc(8)
      buf[0] = 0x1

      this.client.sock.on('data', chunk => this.client.handleData(chunk))
      this.client.sock.emit('data', buf)

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'Expected null byte, got 1')
      }
    })

    it('throws when request rejected or failed', async () => {
      const promise = this.client.readResponse()

      const buf = Buffer.alloc(8)
      buf[1] = 0x5b

      this.client.sock.on('data', chunk => this.client.handleData(chunk))
      this.client.sock.emit('data', buf)

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'Request rejected or failed')
      }
    })

    it('throws on timeout', async () => {
      const promise = this.client.readResponse()

      this.client.sock.destroy = err => this.client.sock.emit('error', err)

      this.clock.tick(60e3)

      try {
        await promise
        assert.fail('Should throw error')
      } catch ({ message }) {
        assert.strictEqual(message, 'Timeout')
      }
    })

    it('reads response', async () => {
      const promise = this.client.readResponse()
      const buf = Buffer.from([ 0x0, 0x5a, 0x0, 0x0, 0x1, 0x2, 0x3, 0x4 ])
      buf.writeUInt16BE(443, 2)

      this.client.sock.on('data', chunk => this.client.handleData(chunk))
      this.client.sock.emit('data', buf)

      const result = await promise

      assert.deepStrictEqual(result, { host: '1.2.3.4', port: 443 })
    })
  })

  describe('#writeRequest()', () => {
    it('writes request for IP address', async () => {
      this.client.write = x => x

      const result = await this.client.writeRequest(443, '1.2.3.4')

      assert.deepStrictEqual(result,
        Buffer.from([ 0x4, 0x1, 0x1, 0xbb, 0x1, 0x2, 0x3, 0x4, 0x0 ])
      )
    })

    it('writes request for domain name', async () => {
      this.client.write = x => x

      const result = await this.client.writeRequest(443, 'foobar.com')

      assert.deepStrictEqual(result,
        Buffer.from([ 0x4, 0x1, 0x1, 0xbb, 0x0, 0x0, 0x0, 0x1, 0x0, ...Buffer.from('foobar.com'), 0x0 ])
      )
    })
  })
})

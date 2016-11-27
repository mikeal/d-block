const test = require('tape')
const http = require('http')
const corsify = require('corsify')
const socketio = require('socket.io')
const server = require('./lib/tracker-server')
const getTracker = require('./lib/tracker-client')
const serverDestroy = require('server-destroy')
const sodium = require('sodium-encryption')

const cors = corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
})

const handler = cors((req, res) => {
  if (req.url === '/') {
    // TODO: status message
  } else {
    res.statusCode = 404
    res.end()
  }
})
const app = http.createServer(handler)
const io = socketio(app)

test('setup server', t => {
  t.plan(1)
  server(io)
  serverDestroy(app)
  app.listen(6688, () => t.ok(true))
})

function getTestTracker (onRequestOffer, onOffer) {
  let keypair = sodium.scalarMultiplicationKeyPair()
  let server = 'ws://localhost:6688'
  let tracker = getTracker(server, keypair.secretKey, keypair.publicKey)
  tracker.onRequestOffer = onRequestOffer
  tracker.onOffer = onOffer
  return tracker
}

test('basic signaling', t => {
  t.plan(2)
  let first = true
  let onRequestOffer = (blockid, publicKey) => {
    let client
    if (first) {
      client = client1
    } else {
      client = client2
    }
    client.send({test: true}, publicKey)
  }
  let onOffer = (data, fromKey) => {
    t.ok(data.test)
    if (first) {
      first = false
      client2.send(data, fromKey)
    } else {
      client1.close()
      client2.close()
    }
  }
  let client1 = getTestTracker(onRequestOffer, onOffer)
  let client2 = getTestTracker(onRequestOffer, onOffer)
  client1.join('test1')
  setTimeout(() => {
    client2.get('test1')
  }, 100)
})

test('teardown', t => {
  t.plan(1)
  app.close(() => t.ok(true))
  io.close()
})

const io = require('socket.io-client')
const sodium = require('sodium-encryption')
const nonce = () => sodium.nonce()

// function createClient () {
//   let keypair = sodium.scalarMultiplicationKeyPair()
//   let tracker = getTracker(keypair.secretKey, keypair.publicKey)
//   tracker.onRequestOffer = (blockid, publicKey) => {

//   }
//   tracker.onOffer = (data, fromKey) => {

//   }
// }

function getTracker (host, privateKey, publicKey) {
  if (!publicKey) {
    // Host is optional
    publicKey = privateKey
    privateKey = host
    host = 'https://d-block.now.sh'
  }

  let encrypt = (data, _nonce, toPublicKey) => {
    let shared = sodium.scalarMultiplication(privateKey, toPublicKey)
    return sodium.encrypt(new Buffer(JSON.stringify(data)), _nonce, shared)
  }

  let decrypt = (data, nonce, shared) => {
    let message = sodium.decrypt(data, nonce, shared)
    return JSON.parse(message.toString())
  }

  let socket = io(host)
  let api = {}

  socket.on('get-offer', (blockid, publicKey) => {
    api.onRequestOffer(blockid, publicKey)
  })
  socket.on('offer', (data, nonce, fromKey) => {
    let shared = sodium.scalarMultiplication(privateKey, fromKey)
    let decrypted = decrypt(data, nonce, shared)
    api.onOffer(decrypted, fromKey)
  })

  api.join = blockid => {
    socket.emit('join-block', blockid)
  }
  api.get = blockid => {
    socket.emit('get-block', blockid, publicKey)
  }
  api.send = (data, toPublicKey) => {
    let _nonce = nonce()
    let encrypted = encrypt(data, _nonce, toPublicKey)
    let args = [toPublicKey, encrypted, _nonce, publicKey]
    socket.emit('send-offer', ...args)
  }
  api.close = () => {
    socket.close()
  }
  return api
}

module.exports = getTracker

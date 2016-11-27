/*
  This service is incredibly simple because it has so many builtin constraints.

  Ideally, this server wouldn't need to exist and if we have good p2p
  messaging. In order to allow for replacements to exist in the future
  this service has the following contraints:

  * When a node joins a block it *only* subscribes to new publicKeys requesting
    that block.
    * There is no service API for listing keys associated with a block, by
      design.
  * Until a node decides to send an offer, presumably because the publicKey
    has asked for a block, it does not subscribe to messages for its own
    publicKey
  * Because the peers that have a block are required to respond their natural
    delay in responding gives an indication of their lag time.
    * Peers that wish to be a "peer of last resort" can intentionally add delay
      to their responses.
    * Peers already connected to a publicKey SHOULD NOT respond through the
      tracker. They can use their existing peer connection and instead of
      connecting again they should update the peer with their stored blocks.
*/
module.exports = function (io) {
  io.on('connection', socket => {
    socket.on('join-block', blockid => {
      socket.join(`block:${blockid}`)
    })
    socket.on('get-block', (blockid, publicKey) => {
      socket.join(`pubkey:${publicKey.toString('base64')}`)
      io.to(`block:${blockid}`).emit('get-offer', blockid, publicKey)
    })
    socket.on('send-offer', (toPublicKey, data, nonce, fromKey) => {
      let pubkey = `pubkey:${toPublicKey.toString('base64')}`
      io.to(pubkey).emit('offer', data, nonce, fromKey)
      socket.join(`pubkey:${fromKey.toString('base64')}`)
    })
  })
  return io
}

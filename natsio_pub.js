const { StringCodec } = require("nats");
module.exports = function (RED) {

  function NatsPubNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;

    node.server = RED.nodes.getNode(n.server)
    // node.server.setMaxListeners(node.server.getMaxListeners() + 1)
    node.server.on('nats_status', (st) => {
      node.status(st)
    });
    const sc = StringCodec();
    node.on('input', function (msg) {
      var subject = msg.replyTo || msg.topic || n.subject;
      var message = msg.payload || n.message;

      if (subject && message && !node.server.nc.closed) {
        this.server.ncSolved.publish(subject, sc.encode(message));
      }
    });

    node.on('close', () => {
      // node.server.setMaxListeners(node.server.getMaxListeners() - 1)
    });
  }
  RED.nodes.registerType("natsio-pub", NatsPubNode);
}

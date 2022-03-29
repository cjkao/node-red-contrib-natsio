const { StringCodec } = require("nats");
module.exports = function (RED) {

  function NatsPubNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;

    node.server = RED.nodes.getNode(n.server)
    node.server.addListener("nats_status", function (status) {
      node.status(status);
    });
    const sc = StringCodec();
    node.on('input', function (msg) {
      var subject = msg.replyTo || msg.topic || n.subject;
      var message = msg.payload || n.message;

      if (subject && message) {
        this.server.nc.then((nc) => nc.publish(subject, sc.encode(message)));
      }
    });

    node.on('close', () => {
      // node.server.setMaxListeners(node.server.getMaxListeners() - 1)
    });
  }
  RED.nodes.registerType("natsio-pub", NatsPubNode);
}

const { connect, credsAuthenticator, ErrorCode, headers, StringCodec, Events, DebugEvents } = require("nats");
module.exports = function (RED) {

  function NatsSubNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    const sc = StringCodec();
    node.server = RED.nodes.getNode(n.server);
    // node.server.setMaxListeners(node.server.getMaxListeners() + 1)
    node.server.addListener("nats_status", function (status) {
      // Do something when the Onvif status changes ...
      node.status(status);
    });
    // var sid = null;

    (async () => {
      node.server.nc.then(async nc => {
        try {
          let opt = {};
          if (parseInt(n.maxWanted) > 0) {
            opt.max = parseInt(n.maxWanted);
          }
          if (n.queue.length > 0) {
            opt.queue = n.queue
          }
          node.subscriber = nc.subscribe(n.subject, opt);
          for await (const m of node.subscriber) {
            node.send({ payload: sc.decode(m.data), topic: n.subject });
            node.log(`[${sub.getProcessed()}]: ${sc.decode(m.data)}`);
          }
        } catch (err) {
          node.status({ fill: "red", shape: "dot", text: err })
          node.log(err);
        }

      });


    })();
    node.on('close', () => {
      node.subscriber.unsubscribe();
    });
  }
  RED.nodes.registerType("natsio-sub", NatsSubNode);
}

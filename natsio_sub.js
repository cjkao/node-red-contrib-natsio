const { connect, credsAuthenticator, ErrorCode, headers, StringCodec, Events, DebugEvents } = require("nats");
module.exports = function (RED) {

  function NatsSubNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    const sc = StringCodec();
    node.server = RED.nodes.getNode(n.server);
    // node.server.setMaxListeners(node.server.getMaxListeners() + 1)

    // node.server.on('Status', (st) => { // (status,action)
    //   if (st.text == 'connected') {
    //     node.sid = node.server.nc.subscribe(n.subject,
    //       { max: n.maxWanted, queue: n.queue },
    //       (message, replyTo, subject) => {
    //         node.send({ payload: message, topic: subject, replyTo: replyTo });
    //       }
    //     );
    //   }
    //   this.status(st)
    // });

    node.server.nc.then(async nc => {
      if (node.server.ncSolved) {
        for await (const s of nc.status()) {
          switch (s.type) {
            case Events.Disconnect:
              node.status({ fill: "red", shape: "dot", text: "client disconnected" });
              console.log(`client disconnected - ${s.data}`);
              break;
            case Events.LDM:
              node.status({ fill: "green", shape: "dot", text: "being request to reconnect" });
              console.log("client has been requested to reconnect");
              break;
            case Events.Update:
              console.log(`client received a cluster update - ${s.data}`);
              break;
            case Events.Reconnect:
              node.status({ fill: "green", shape: "dot", text: "reconnected" });
              console.log(`client reconnected - ${s.data}`);
              break;
            case Events.Error:
              // node.log(e)
              node.status({ fill: "red", shape: "dot", text: "Broker not found" })
              console.log("client got a permissions error");
              break;
            case DebugEvents.Reconnecting:
              node.status({ fill: "yellow", shape: "ring", text: "reconnecting" });
              console.log("client is attempting to reconnect");
              break;
            case DebugEvents.StaleConnection:
              node.status({ fill: "red", shape: "dot", text: "stale connection" });
              console.log("client has a stale connection");
              break;
            default:
              node.status({ fill: "green", shape: "dot", text: "unknown status" });
              console.log(`got an unknown status ${s.type}`);
          }
        }
      }




    });
    (async () => {

      // (async () => {
      //   for await (const s of node.server.nc.status()) {
      //     switch (s.type) {
      //       case Events.Disconnect:
      //         node.emit('Status', { fill: "red", shape: "dot", text: "client disconnected" });
      //         console.log(`client disconnected - ${s.data}`);
      //         break;
      //       case Events.LDM:
      //         node.emit('Status', { fill: "green", shape: "dot", text: "being request to reconnect" });
      //         console.log("client has been requested to reconnect");
      //         break;
      //       case Events.Update:
      //         console.log(`client received a cluster update - ${s.data}`);
      //         break;
      //       case Events.Reconnect:
      //         node.emit('Status', { fill: "green", shape: "dot", text: "reconnect" });
      //         console.log(`client reconnected - ${s.data}`);
      //         break;
      //       case Events.Error:
      //         // node.log(e)
      //         node.emit('Status', { fill: "red", shape: "dot", text: "Broker not found" })
      //         console.log("client got a permissions error");
      //         break;
      //       case DebugEvents.Reconnecting:
      //         node.emit('Status', { fill: "green", shape: "dot", text: "reconnected" });
      //         console.log("client is attempting to reconnect");
      //         break;
      //       case DebugEvents.StaleConnection:
      //         node.emit('Status', { fill: "green", shape: "dot", text: "stale connection" });
      //         console.log("client has a stale connection");
      //         break;
      //       default:
      //         node.emit('Status', { fill: "yellow", shape: "dot", text: "unknown status" });
      //         console.log(`got an unknown status ${s.type}`);
      //     }
      //   }
      // })();
      node.server.nc.then(async nc => {
        try {
          const sub = nc.subscribe(n.subject);

          for await (const m of sub) {
            node.send({ payload: sc.decode(m.data), topic: n.subject });
            console.log(`[${sub.getProcessed()}]: ${sc.decode(m.data)}`);
          }
        } catch (err) {
          node.emit('Status', { fill: "red", shape: "dot", text: err })
          console.log(err);
        }

      });


    })();




    // node.on('close', () => {
    //   if (node.sid) {
    //     node.server.nc.unsubscribe(node.sid);
    //   }
    //   node.server.setMaxListeners(node.server.getMaxListeners() - 1)
    // });
  }
  RED.nodes.registerType("natsio-sub", NatsSubNode);
}

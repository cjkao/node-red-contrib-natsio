// var nats = require('nats');
const { connect, credsAuthenticator, ErrorCode, headers, StringCodec, Events, DebugEvents } = require("nats");
const natsFun = async function (RED) {

  function RemoteServerNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    var user = node.credentials.username;
    var pass = node.credentials.password;

    let server = 'nats://';
    if (user) {
      server += user + (pass ? ':' + pass : '') + '@';
    }
    server += `${n.host}:${n.port}`;
    console.log("server:" + user + `${n.host}:${n.port}`);

    (async () => {

      // try {
      if (user) {
        node.nc = connect({
          port: n.port, server: [server], reconnectTimeWait: 10 * 1000, waitOnFirstConnect: true
        });
      } else {

        let authenticator = credsAuthenticator(new TextEncoder().encode(n.cred));

        node.nc = connect({
          port: n.port, server: [server], "authenticator": authenticator, reconnectTimeWait: 10 * 1000, waitOnFirstConnect: true
        });
      }
      // } 




      node.nc.then(async nc => {
        nc.closed().then(() => {
          console.log("the connection closed!");
        });
        node.ncSolved = nc;
        return nc;
      }).then(async nc => {
        for await (const s of nc.status()) {
          switch (s.type) {
            case Events.Disconnect:
              node.emit('nats_status', { fill: "red", shape: "dot", text: "client disconnected" });
              node.log(`client disconnected - ${s.data}`);
              break;
            case Events.LDM:
              node.emit('nats_status', { fill: "green", shape: "dot", text: "being request to reconnect" });
              node.log("client has been requested to reconnect");
              break;
            case Events.Update:
              node.log(`client received a cluster update - ${s.data}`);
              break;
            case Events.Reconnect:
              node.emit('nats_status', { fill: "green", shape: "dot", text: "reconnected" });
              node.log(`client reconnected - ${s.data}`);
              break;
            case Events.Error:
              // node.log(e)
              node.emit('nats_status', { fill: "red", shape: "dot", text: "Broker not found" })
              node.log("client got a permissions error");
              break;
            case DebugEvents.Reconnecting:
              node.emit('nats_status', { fill: "yellow", shape: "ring", text: "reconnecting" });
              node.log("client is attempting to reconnect");
              break;
            case DebugEvents.StaleConnection:
              node.emit('nats_status', { fill: "red", shape: "dot", text: "stale connection" });
              node.log("client has a stale connection");
              break;
            default:
              node.emit('nats_status', { fill: "green", shape: "dot", text: "unknown status" });
              node.log(`got an unknown status ${s.type}`);
          }
        }

      });
    })().catch(err => {
      console.log(err);
    });


    // {
    //   node.status({ fill: "red", shape: "dot", text: err.message ? err.message : "authenticate error" });
    //   node.nc = Promise.resolve(err);
    //   console.log(err);
    //   return;
    // }

    (async () => {
      node.on('close', async function () {
        if (node.ncSolved) {
          await node.ncSolved.close();
        }
      });
    })();

  }

  RED.nodes.registerType('natsio-server', RemoteServerNode, {
    credentials: {
      username: { type: "text" },
      password: { type: "password" }
    }
  });
}
module.exports = natsFun;
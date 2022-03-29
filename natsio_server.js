// var nats = require('nats');
const { connect, credsAuthenticator, ErrorCode, headers, StringCodec, Events, DebugEvents } = require("nats");
const natsFun = function (RED) {

  function RemoteServerNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    var user = node.credentials.username;
    var pass = node.credentials.password;

    let server = n.url.split(',');
    console.log("server: " + n.host + " user: " + user);

    (async () => {
      if (user) {
        node.nc = connect({
          servers: [server], reconnectTimeWait: 10 * 1000, waitOnFirstConnect: true,
          user: user, pass: pass,
        });
      } else {
        let authenticator = credsAuthenticator(new TextEncoder().encode(n.cred));
        node.nc = connect({
          servers: [server], "authenticator": authenticator, reconnectTimeWait: 10 * 1000, waitOnFirstConnect: true
        });
      }
      node.nc.then((nc) => {
        console.log(`connected to ${nc.getServer()}`);
      });




      node.nc.then(async nc => {
        nc.closed().then(() => {
          console.log("the connection closed!");
        });
        // node.ncSolved = nc;
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
    })();


    // {
    //   node.status({ fill: "red", shape: "dot", text: err.message ? err.message : "authenticate error" });
    //   node.nc = Promise.resolve(err);
    //   console.log(err);
    //   return;
    // }

    node.on('close', function () {
      node.nc.then(async (nc) => { await nc.close(); });
    });

  }

  RED.nodes.registerType('natsio-server', RemoteServerNode, {
    credentials: {
      username: { type: "text" },
      password: { type: "password" }
    }
  });
}
module.exports = natsFun;
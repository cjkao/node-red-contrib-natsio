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
    console.log(server);






    (async () => {

      try {
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
      } catch (err) {
        node.status({ fill: "red", shape: "dot", text: err.message ? err.message : "authenticate error" });
        node.nc = Promise.resolve(err);
        console.log(err);
        return;
      }



      node.nc.then(async nc => {
        nc.closed().then(() => {
          console.log("the connection closed!");
        });
        node.ncSolved = nc;


      });
    })();


    (async () => {
      node.on('close', async function () {
        if (node.ncSolved && !node.ncSolved.closed) {

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
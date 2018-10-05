const WebSocket = require('ws');
const request = require('request');

let registry = null;

function register(manifest){
  registry = manifest;
};

var channel = {};

function mkctx(socket) {
  return {
    query: (sql)=>{

    },
    response: (resp)=>{
      socket.send(JSON.stringify(resp));
    }
  };
}

function dispatch(msg){
  console.log("Message", JSON.stringify(msg)); 
  var opid = msg.operation;
  var handler = registry["Operations"][opid];
  if(handler.handler){
    handler.handler(mkctx(channel.socket), msg);
  }
  channel.socket.send(JSON.stringify({body: "Ups no handler!"}));
}

function connect(opts, cb){
  return new Promise(function(resolve, reject) {
    request({
      url: 'http://localhost:7777/_extension/init',
      method: 'POST',
      json: true,
      body: registry
    }, (err, resp, body) => {
      console.log("INIT", body);

      const ws = new WebSocket('ws://localhost:7777/_extension/test', {
        perMessageDeflate: false
      });

      ws.on('open', () => {
        channel.socket = ws;
      });

      ws.on('message', (data) => {
        dispatch(JSON.parse(data));
      });
    });
  });
}

function server(){
  const aidbox_host = process.env.AIDBOX_HOST || 'localhost';
  const aidbox_port = process.env.AIDBOX_PORT || 7777;

  connect({
    hostname: aidbox_host,
    port: aidbox_port,
    method: "GET",
    path: "/_extension/init",
  });

}

let aidbox = {
  manifest: register,
  start: server
};

module.exports = aidbox;

// const srv = http.createServer(dispatch);
// const host = process.env.SERVICE_HOST;
// const port = process.env.SERVICE_PORT || 3334;
// var module = {
//   service: {
//     host: host,
//     port: port,
//     schema: process.env.SERVICE_SCHEMA
//   },
//   resources: registry
// };

// post({
//   hostname: aidbox_host,
//   port: aidbox_port,
//   method: "POST",
//   path: "/_extension/init",
//   data: module
// }).then((res)=> {
//   console.log(JSON.stringify(res));
//   if(res.status < 300) {
//     srv.listen(port, (err) => {
//       if (err) {
//         return console.log('something bad happened', err);
//       }
//       console.log(`server is listening on ${port}`);
//       return true;
//     });
//   } else {
//     console.log(`Can not connect to aidbox ${aidbox_host}/${aidbox_port}` );
//   }
// }).catch((e)=>{
//   console.log(`Can not connect to aidbox ${aidbox_host}/${aidbox_port}`, e );
// });

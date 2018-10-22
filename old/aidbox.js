const WebSocket = require('ws');
const request = require('request');

let registry = null;

function register(manifest){
  registry = manifest;
};

var channel = {};

function mkctx(opts, socket) {
  return {
    opts: opts,
    query: (sql)=>{
      return new Promise(function(resolve, reject) {
        request({
          url: mk_url(opts, '$psql'),
          method: 'POST',
          json: true,
          body: {query: sql} 
        }, (err, resp, body) => {
          if(err){
            reject(err);
          } else {
            resolve(body[0].result);
          }
        });
      });
    },
    response: (resp)=>{
      socket.send(JSON.stringify(resp));
    }
  };
}

function dispatch(opts, msg){
  console.log("Message", JSON.stringify(msg)); 
  var opid = msg.operation.id;
  var handler = registry["operations"][opid];
  if(handler.handler){
    handler.handler(mkctx(opts, channel.socket), msg);
  } else {
    channel.socket.send(JSON.stringify({body: "Ups no handler!"}));
  }
}

function mk_url(opts){
  var path = Array.prototype.slice.call(arguments, 1);
  return opts.schema + '://' + opts.host + ':' + opts.port + '/' + path.join('/');
}

function mk_ws_url(opts){
  var path = Array.prototype.slice.call(arguments, 1);
  return 'ws' + '://' + opts.host + ':' + opts.port + '/' + path.join('/');
}

function connect(opts, cb){
  return new Promise(function(resolve, reject) {
    var init_url = mk_url(opts, 'Addon', '$init');
    console.log('Init Addon at ', init_url);
    request({
      url: init_url,
      method: 'POST',
      json: true,
      body: registry
    }, (err, resp, body) => {
      if(err){
        console.error(err);
        return false;
      }
      console.log("Register addon", JSON.stringify(body));

      var vs_url = mk_ws_url(opts,'Addon', '$socket');
      console.log("Connecting to socket at", vs_url);
      const ws = new WebSocket(vs_url, {
        perMessageDeflate: false
      });

      ws.on('open', () => {
        console.log('Connected!');
        channel.socket = ws;
      });

      ws.on('message', (data) => {
        dispatch(opts, JSON.parse(data));
      });
    });
  });
}

function server(){
  const aidbox_host   = process.env.AIDBOX_HOST || 'localhost';
  const aidbox_schema = process.env.AIDBOX_SCHEMA || 'http';
  const aidbox_port   = process.env.AIDBOX_PORT || 8080;

  connect({
    host: aidbox_host,
    port: aidbox_port,
    schema: aidbox_schema
  });

}

let aidbox = {
  manifest: register,
  start: server
};

module.exports = aidbox;

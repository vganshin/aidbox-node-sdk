const request = require('request');
const http = require('http');

let registry = null;

function register(manifest){
  registry = manifest;
}

function mkctx(opts, httpresp) {
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
      httpresp.end(JSON.stringify(resp));
    }
  };
}

function dispatch(opts, req, resp){
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', () => {
    var msg = JSON.parse(body);
    var opid = msg.operation.id;
    var handler = registry["operations"][opid];
    if(handler.handler){
      handler.handler(mkctx(opts, resp), msg);
    } else {
      resp.end(JSON.stringify({body: "Ups no handler!", operation: msg.operation}));
    }
  });
}


function mk_url(opts){
  var path = Array.prototype.slice.call(arguments, 1);
  return opts.schema + '://' + opts.host + ':' + opts.port + '/' + path.join('/');
}

// function mk_ws_url(opts){
//   var path = Array.prototype.slice.call(arguments, 1);
//   return 'ws' + '://' + opts.host + ':' + opts.port + '/' + path.join('/');
// }

function connect(opts){
  return new Promise(function(resolve, reject) {
    var init_url = mk_url(opts, 'Addon', '$init');
    console.log('Init Addon at ', init_url);
    registry.endpoint = opts.endpoint;
    request({
      url: init_url,
      method: 'POST',
      json: true,
      body: registry
    }, (err, resp, body) => {
      if(err){
        console.error(err);
        reject(err);
        return false;
      } else {
        console.log("Register addon", JSON.stringify(body));
        resolve(body);
      }
    });
  });
}


function server(){
  const host = process.env.SERVICE_HOST || 'localhost';
  const port = process.env.SERVICE_PORT || 3334;
  const schema = process.env.SERVICE_SCHEMA || 'http';

  const aidbox_host   = process.env.AIDBOX_HOST || 'localhost';
  const aidbox_schema = process.env.AIDBOX_SCHEMA || 'http';
  const aidbox_port   = process.env.AIDBOX_PORT || 8080;

  const opts = {
    host: aidbox_host,
    port: aidbox_port,
    schema: aidbox_schema,
    endpoint: {
      host: host,
      port: port,
      schema: schema
    }
  };

  const srv = http.createServer((req, resp)=>{
    dispatch(opts, req, resp);
  });

  connect(opts).then(()=>{
    srv.listen(port, (err) => {
      if (err) {
        return console.log('something bad happened', err);
      }
      console.log(`server is listening on ${port}`);
      return true;
    });
  }).catch((e)=>{
    console.log(`Can not connect to aidbox ${aidbox_host}/${aidbox_port}`, e );
  });
}

let aidbox = {
  manifest: register,
  start: server
};

module.exports = aidbox;

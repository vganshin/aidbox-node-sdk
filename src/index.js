const request = require('request');
const http = require('http');
const api = require('./api');
const fs = require('fs');
const path = require('path');

let registry = null;

function mk_url(ctx, opts){
  var box = ctx.box;
  return box.scheme + '://' + box.host + ':' + box.port + opts.url;
}

function box_request(ctx, opts){
  return new Promise(function(resolve, reject) {
    var init_url = mk_url(ctx, opts);
    console.log('Request:', opts.method, init_url);
    request(Object.assign(opts, {
      url: init_url,
      json: true,
      auth: {
        user: ctx.box.client.id,
        pass: ctx.box.client.secret
      }
    }), (err, resp, body) => {
      if(err){
        console.error(err);
        reject(err);
        return false;
      } else {
        if(resp.statusCode && resp.statusCode < 300){
          resolve(body);
        } else {
          reject(resp);
        }
        return true;
      }
    });
  });
}

function mk_query(ctx) {
  return function(){
    var q = Array.prototype.slice.call(arguments, 0);
    console.log("SQL:", q);
    return box_request(ctx, {
      url: '/$sql',
      method: 'post',
      body: q
    });
  };
}

function mk_ctx(ctx){
  ctx.query = mk_query(ctx);
  return ctx;
}

function dispatch(ctx, req, resp){
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', () => {
    try {
      var msg = JSON.parse(body);
      var opid = msg.operation.id;
      var op = ctx.manifest.operations[opid];
      console.log('dispatch [' + opid + ']');
      var h = op.handler;
      if(h){
        ctx.response = (r)=>{
          resp.end(JSON.stringify(r));
        };
        var p = h(ctx, msg);
        if(p && p.catch){
          p.catch((err)=>{
            resp.end(JSON.stringify({status: 500, body: {error: err}}));
          });
        }
      } else {
        resp.end(JSON.stringify({status: 404, body: {message: 'Operation ' + opid + ' not found'}}));
      }
    } catch(e) {
      resp.end(JSON.stringify({status: 500, body: {message: e.toString()}}));
    }
  });
}


// function mk_ws_url(opts){
//   var path = Array.prototype.slice.call(arguments, 1);
//   return 'ws' + '://' + opts.host + ':' + opts.port + '/' + path.join('/');
// }

function connect(opts){
  return new Promise(function(resolve, reject) {
    var init_url = mk_url(opts, 'App');
    console.log('Init App at ', init_url);
    registry.endpoint = opts.endpoint;
    request({
      url: init_url,
      method: 'POST',
      json: true,
      body: opts
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

var env_vars = [
  ['AIDBOX_CLIENT_ID'],
  ['AIDBOX_CLIENT_SECRET'],
  ['AIDBOX_PORT'],
  ['AIDBOX_SCHEME'],
  ['AIDBOX_HOST', 'localhost']
];

function load_env(){
  var envfile= path.resolve(process.cwd(), '.env');
  var env = {};
  console.log('Check .env file', envfile, fs.existsSync(envfile));
  if(fs.existsSync(envfile)) {
    var res = fs.readFileSync(envfile, 'UTF-8');
    if(res){
      env = res.split(/\n/)
          .filter((x)=> {
            return x !== '' && x[0] != '#' && x.indexOf('=') > -1 ;
          }).reduce((acc, x)=> {
            var idx = x.indexOf('=');
            var k = x.substr(0, idx);
            var v = x.substr(idx+1);
            acc[k] = v;
            return acc; 
          }, env);
    }
  }
  env_vars.reduce((acc, x)=>{
    var v = process.env[x[0]] || env[x[0]] || x[1];
    if(v && v != '') {
      acc[x[0]] = v;
    }
    return acc;
  }, env);

  return env;
}

function to_config(env, manifest){
  var app = {
    host: env.APP_HOST || 'localhost',
    port: parseInt(env.APP_PORT || '3333'),
    scheme: env.APP_SCHEME || 'http',
    type: 'http-rpc'
  };
  var ctx = {
    box: {
      scheme: env.AIDBOX_SCHEME || 'http',
      host: env.AIDBOX_HOST || 'localhost',
      port: env.AIDBOX_PORT,
      client: {
        id: env.AIDBOX_CLIENT_ID,
        secret: env.AIDBOX_CLIENT_SECRET
      }
    },
    app: app,
    manifest: Object.assign(manifest, {
      resourceType: 'App',
      apiVersion: 1,
      type: 'app',
      endpoint: app
    })
  };
  return ctx;
}


function init_manifest(ctx){
  return box_request(ctx, {
    url: '/App',
    method: 'post',
    body: ctx.manifest
  });
}

function server(manifest){
  var ctx = to_config(load_env(), manifest);
  ctx = mk_ctx(ctx);
  // console.log("Context:", JSON.stringify(ctx, null, ' '));
  init_manifest(ctx).then((res)=>{
    const srv = http.createServer((req, resp)=>{
      dispatch(ctx, req, resp);
    });
    srv.listen(ctx.app.port, (err) => {
      if (err) { return console.log('something bad happened', err); }
      console.log(`server is listening on ${ctx.app.port}`);
      return true;
    });
  }).catch((e)=>{
    console.log("ERROR:", e.statusCode || e, e.body);
  });


  // connect(opts).then(()=>{
  //   srv.listen(port, (err) => {
  //     if (err) {
  //       return console.log('something bad happened', err);
  //     }
  //     console.log(`server is listening on ${port}`);
  //     return true;
  //   });
  // }).catch((e)=>{
  //   console.log(`Can not connect to aidbox ${aidbox_host}/${aidbox_port}`, e );
  // });
}

let aidbox = {
  start: server
};

module.exports = aidbox;

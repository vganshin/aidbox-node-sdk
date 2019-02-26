const request = require('request');
const http = require('http');

function box_request(ctx, opts){
  return new Promise(function(resolve, reject) {
    var init_url = ctx.env.init_url + opts.url;
    console.log('Request:', opts.method, init_url);
    var params = {
      url: init_url,
      json: true
    };
    if (ctx.env.init_client_id && ctx.env.init_client_secret) {
      params.auth = {
        user: ctx.env.init_client_id,
        pass: ctx.env.init_client_secret
      };
    }
    request(Object.assign(opts, params), (err, resp, body) => {
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

function mk_request(ctx) {
  return function(opts){
    return box_request(ctx, opts);
  };
}

function mk_ctx(ctx){
  ctx.query = mk_query(ctx);
  ctx.request = mk_request(ctx);
  return ctx;
}

function mk_manifest(ctx) {
  var rt = { resourceType: "App",
             apiVersion: 1,
             endpoint: { url: ctx.env.app_url,
                         type: "http-rpc",
                         secret: ctx.env.app_secret }};
  return Object.assign({}, ctx.manifest, rt);
}

function dispatch(ctx, req, resp) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', () => {
    resp.setHeader('Content-Type', 'application/json');
    console.log("Msg", body);
    try {
      var msg = JSON.parse(body);
      // var opid = msg.operation.id;
      var opid = msg.type;
      if (opid === 'manifest') {
        resp.end(JSON.stringify({ manifest: mk_manifest(ctx),
                                  status: 200}));
        return;
      } else if (opid === 'config' || opid === 'subscription') {
        resp.end(JSON.stringify({}));
        return;
      }
      var op = ctx.manifest.operations[opid];
      console.log('dispatch [' + opid + ']');
      var h = op.handler;
      if (h) {
        ctx.response = (r) => {
          resp.end(JSON.stringify(r));
        };
        var p = h(ctx, msg);
        if(p && p.catch){
          p.catch((err) => {
            resp.end(JSON.stringify({status: 500, body: {error: err}}));
          });
        }
      } else {
        resp.end(JSON.stringify({status: 422, body: {message: 'Unknown message type [' + opid + ']'}}));
      }
    } catch(e) {
      resp.end(JSON.stringify({status: 500, body: {message: e.toString()}}));
    }
  });
}

function init_manifest(ctx){
  return box_request(ctx, {
    url: '/App/$init',
    method: 'post',
    body: {
      url: ctx.env.app_url,
      secret: ctx.env.app_secret
    }
  });
}
var srv = null;

function server(ctx) {
  ctx = mk_ctx(ctx);
  console.log("Context:", JSON.stringify(ctx, null, ' '));
  return new Promise(function(resolve, reject) {
    srv = http.createServer((req, resp) => {
      dispatch(ctx, req, resp);
    });
    srv.listen(ctx.env.app_port, (err) => {
      if (err) {
        return console.log('something bad happened', err);
      }
      console.log(`server is listening on ${ctx.env.app_port}`);
      return init_manifest(ctx)
        .then(() => resolve(ctx))
        .catch((e) => {
          reject(e);
          console.log("ERROR:", e.statusCode || e, e.body);
        });
    });
  });
}

module.exports = {
  start: server,
  stop: ()=>{
    srv && srv.close();
  }
};

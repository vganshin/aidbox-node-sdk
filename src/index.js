const request = require('request');
const http = require('http');

const registredSubscription = {};

function box_request(ctx, opts){
  return new Promise(function(resolve, reject) {
    const init_url = `${ctx.env.init_url}${opts.url}`;
    console.log('Request:', opts.method, init_url);
    const params = {
      url: init_url,
      json: true
    };
    if (ctx.state && ctx.state.id && ctx.state.secret) {
      params.auth = {
        user: ctx.state.id,
        pass: ctx.state.secret
      };
    } else if (ctx.env.init_client_id && ctx.env.init_client_secret) {
      params.auth = {
        user: ctx.env.init_client_id,
        pass: ctx.env.init_client_secret
      };
    }
    const request_params = Object.assign({}, opts, params);
    request(request_params, (err, resp, body) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        if(resp.statusCode && resp.statusCode < 300){
          resolve(body);
        } else {
          reject(resp);
        }
      }
    });
  });
}

function mk_query(ctx) {
  return function(){
    const q = Array.prototype.slice.call(arguments, 0);
    console.log('SQL:', q);
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
  const rt = {
    resourceType: 'App',
    apiVersion: 1,
    type: ctx.type || 'app',
    endpoint: {
      url: ctx.env.app_url,
      type: 'http-rpc',
      secret: ctx.env.app_secret
    }};
  const manifest  = Object.assign({}, ctx.manifest, rt);
  if (manifest.subscriptions) {
    const subs = manifest.subscriptions;
    Object.keys(subs).forEach((s) => {
      Object.keys(subs[s]).forEach((h) => {
        const id = `${s}_${h}`;
        console.log(`register subscription [${s}] for handler: ${h} by id ${id}`);
        registredSubscription[id] = subs[s][h];
        manifest.subscriptions[s][h] = id;
      });
    });
  }
  console.log('mk_manifest: ', JSON.stringify(manifest, null, ' '));
  return manifest;
}

function sendResponse(r, status, message) {
  r.statusCode = status;
  r.end(JSON.stringify(message));
}

function dispatch(ctx, req, resp) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', () => {
    resp.setHeader('Content-Type', 'application/json');
    try {
      const msg = JSON.parse(body);
      const operation = msg.type;
      if (operation === 'manifest') {
        console.log('manifest', JSON.stringify(msg, null, ' '));
        sendResponse(resp, 200, {status: 200, manifest: mk_manifest(ctx)});
      } else if (operation === 'config') {
        console.log('config', JSON.stringify(msg, null, ' '));
        ctx.state = msg.client;
        sendResponse(resp, 200, {});
      } else if (operation === 'subscription') {
        console.log('subscription', JSON.stringify(msg, null, ' '));
        sendResponse(resp, 200, {status: 200, message: 'Subscription'});
        const handlerId = msg.handler;
        if (handlerId in registredSubscription) {
          registredSubscription[handlerId](ctx, msg);
          sendResponse(resp, 200, {});
        } else {
          sendResponse(resp, 404, {status: 404, message: `Subscription [${handlerId}] not found`});
        }
      } else if (operation === 'operation') {
        const operationId = msg.operation.id;
        console.log('operation', JSON.stringify(msg, null, ' '));
        if (operationId in ctx.manifest.operations) {
          const operation = ctx.manifest.operations[operationId];
          if (operation.handler) {
            const handler = operation.handler;
            handler(ctx, msg)
              .then(r => sendResponse(resp, 200, r))
              .catch(error => sendResponse(resp, 500, {error}));
          } else {
            sendResponse(resp, 500, {status: 500, message: `Operation [${operationId}] handler not found`});
          }
        } else {
          sendResponse(resp, 404, {status: 404, message: `Operation [${operationId}] not found`});
        }
      } else {
        console.log('operation not found', JSON.stringify(msg, null, ' '));
        sendResponse(resp, 422, {status: 422, message: `Unknown message type [${operation}]`});
      }
    } catch (e) {
      resp.statusCode = 500;
      resp.end(JSON.stringify({status: 500, body: {message: e.toString()}}));
    }
  });
}

function init_manifest(ctx) {
  return box_request(ctx, {
    url: '/App/$init',
    method: 'post',
    body: {
      url: ctx.env.app_url,
      secret: ctx.env.app_secret
    }
  });
}

let srv = null;

function server(ctx) {
  ctx = mk_ctx(ctx);
  console.log('Context:', JSON.stringify(ctx, null, ' '));
  return new Promise(function(resolve, reject) {
    srv = http.createServer((req, resp) => {
      dispatch(ctx, req, resp);
    });
    srv.listen(ctx.env.app_port, (err) => {
      if (err) {
        console.error('server listen error:', err);
        return;
      }
      console.log(`server started on http://localhost:${ctx.env.app_port}`);
      init_manifest(ctx)
        .then(() => resolve(ctx))
        .catch((e) => {
          console.log('ERROR:', e.statusCode || e, e.body);
          reject(e);
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

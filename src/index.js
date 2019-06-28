const request = require('request');
const http = require('http');

const registredSubscription = {};

function box_request(ctx, opts){
  return new Promise(function(resolve, reject) {
    const init_url = `${ctx.env.init_url}${opts.url}`;
    if (ctx.debug) {
      console.log('Request:', opts.method, init_url);
      console.log('Request body:', opts.body);
    }
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
        if (ctx.debug) {
          console.error(err);
        }
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
    const query = Array.prototype.slice.call(arguments, 0);
    if (ctx.debug) {
      console.log('SQL:', query[0]);
    }
    return box_request(ctx, {
      url: '/$psql',
      method: 'post',
      body: {
        query: query[0]
      }
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
        if (ctx.debug) {
          console.log(`register subscription [${s}] for handler: ${h} by id ${id}`);
        }
        registredSubscription[id] = subs[s][h];
        manifest.subscriptions[s][h] = id;
      });
    });
  }
  if (ctx.debug) {
    console.log('mk_manifest: ', JSON.stringify(manifest, null, ' '));
  }
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
        if (ctx.debug) {
          console.log('manifest', JSON.stringify(msg, null, ' '));
        }
        sendResponse(resp, 200, {status: 200, manifest: mk_manifest(ctx)});
      } else if (operation === 'config') {
        if (ctx.debug) {
          console.log('config', JSON.stringify(msg, null, ' '));
        }
        ctx.state = msg.client;
        sendResponse(resp, 200, {});
      } else if (operation === 'subscription') {
        if (ctx.debug) {
          console.log('subscription', JSON.stringify(msg, null, ' '));
        }
        const handlerId = msg.handler;
        if (handlerId in registredSubscription) {
          registredSubscription[handlerId](ctx, msg);
          sendResponse(resp, 200, {});
        } else {
          sendResponse(resp, 404, {status: 404, message: `Subscription [${handlerId}] not found`});
        }
      } else if (operation === 'operation') {
        const operationId = msg.operation.id;
        if (ctx.debug) {
          console.log('operation', JSON.stringify(msg, null, ' '));
        }
        if (operationId in ctx.manifest.operations) {
          const operation = ctx.manifest.operations[operationId];
          if (operation.handler) {
            const handler = operation.handler;
            handler(ctx, msg)
              .then(r => sendResponse(resp, 200, r))
              .catch(error => sendResponse(resp, 500, {status: 500, message: error}));
          } else {
            sendResponse(resp, 500, {status: 500, message: `Operation [${operationId}] handler not found`});
          }
        } else {
          sendResponse(resp, 404, {status: 404, message: `Operation [${operationId}] not found`});
        }
      } else {
        if (ctx.debug) {
          console.log('operation not found', JSON.stringify(msg, null, ' '));
        }
        sendResponse(resp, 422, {status: 422, message: `Unknown message type [${operation}]`});
      }
    } catch (e) {
      resp.statusCode = 500;
      resp.end(JSON.stringify({status: 500, message: e.toString()}));
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

function server(ctx) {
  const context = mk_ctx({ ...ctx });
  if (context.debug) {
    console.log('Context:', JSON.stringify(context, null, ' '));
  }
  if ('withoutServer' in context) {
    return Promise.resolve({
      ctx: context,
      dispatch,
      init_manifest
    });
  }
  return new Promise(function(resolve, reject) {
    context.server = http.createServer((req, resp) => {
      dispatch(context, req, resp);
    });
    context.stop = (cb) => context.server.close(cb);
    context.server.on('error', (err) => {
      reject(err);
      context.server.close();
    })
    context.server.listen(context.env.app_port, '0.0.0.0', () => {
      if (context.debug) {
        console.log(`server started on http://localhost:${context.env.app_port}`);
      }
      return init_manifest(context)
        .then(() => resolve(context))
        .catch((e) => {
          context.stop();
          reject(e);
        });
    });
  });
}

module.exports = server;

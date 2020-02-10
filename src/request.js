const { URL, URLSearchParams } = require('url');
const http = require('http');
const https = require('https');

module.exports = function({
  url,
  method = 'get',
  body = null,
  auth = null,
  json = false
}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const r = {
      http: http.request,
      https: https.request
    };
    const lib = parsedUrl.protocol.slice(0, parsedUrl.protocol.length - 1);
    const searchParams = new URLSearchParams(parsedUrl.search);
    const path = `${parsedUrl.pathname}?${searchParams.toString()}`;
    const params = {
      host: parsedUrl.hostname,
      port: parsedUrl.port,
      path,
      method: method.toUpperCase(),
      auth: auth ? `${auth.user}:${auth.pass}` : null,
      headers: {}
    };
    if (json) {
      params.headers['Content-Type'] = 'application/json';
      params.headers['Accept'] = 'application/json';
    }
    const req = r[lib](params, res => {
      let response = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        response += chunk;
      });
      res.on('end', () => {
        try {
          if (json && response && response.length > 0) {
            response = JSON.parse(response);
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: response
          });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', e => {
      console.log('error', e);
      reject(e);
    });
    if (method.toUpperCase() !== 'GET') {
      if (json) {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
};

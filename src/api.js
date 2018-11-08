const request = require('request');

function mk_url(opts){
  var path = Array.prototype.slice.call(arguments, 1);
  return opts.schema + '://' + opts.host + ':' + opts.port + '/' + path.join('/');
}

function mk_response(httpresp) {
  return (resp)=>{
    httpresp.end(JSON.stringify(resp));
  };
}

function mk_query(opts) {
  return (sql)=>{
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
  };
}

function mkctx(opts, httpresp) {
  return {
    opts: opts,
    query: mk_query(opts),
    response: mk_response(httpresp)
  };
}

module.exports = {
  mkctx: mkctx
};

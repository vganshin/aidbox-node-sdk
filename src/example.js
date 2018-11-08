var aidbox = require('./index.js');

function report(ctx, request){
  console.log("my handler");
  return ctx.query("SELECT count(*) FROM Attribute")
    .then((data)=>{
      ctx.response({
        body: data,
        status: 200
      });
    });
}

var manifest = {
  id: 'myapp',
  operations: {
    report: {
      method: 'GET',
      path: ["_report"],
      handler: report
    }
  }
};


var ctx = aidbox.start(manifest);

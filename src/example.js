var aidbox = require('./index.js');

function report(ctx){
  console.log("my handler");
  return ctx.query("SELECT count(*) FROM Attribute")
    .then((data)=>{
      console.log("data", data);
      ctx.response({
        body: data[0].count,
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


module.exports = {
  start: ()=>{
    return aidbox.start(manifest);
  },
  stop: ()=>{
    return aidbox.stop();
  }

};

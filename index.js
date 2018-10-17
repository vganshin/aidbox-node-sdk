// const aidbox = require('./aidbox');
const aidbox = require('./aidboxp');

const patient_list = (ctx, request) => {
  console.log("pt handler", request);
  ctx.query("SELECT id, resource->'request' as req FROM Operation")
    .then((data)=>{

      var resp = data.reduce((acc, x)=>{
        acc[x.id] = x.req.join('/');
        return acc;
      }, {});

      ctx.response({
        body: resp,
        status: 200
      });
    });
};


aidbox.manifest({
  id: 'example.aidbox.app',
  version: 2,
  operations: {
    patient_list: {
      request: ['get', 'Patient', '$list'] ,
      handler: patient_list 
    }
  }
});

aidbox.start();

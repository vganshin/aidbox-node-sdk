const aidbox = require('./aidbox');

const patient_list = (ctx, request) => {
  console.log("pt handler");
  ctx.response({
    body: [{name: "Nikola"}],
    status: 200
  });
};


const report = (ctx, request) => {
  console.log("pt handler");
  ctx.response({
    body: {title: "Daily report"},
    status: 200
  });
};

const validate_pt = (ctx, pt)=> {};
const on_pt_change = (ctx, pt)=> {};

aidbox.manifest({
  name: 'example.aidbox.app',
  // version: 2,
  Operations: {
    patient_list: {
      request: ['get', 'Patient', '$list'] ,
      handler: patient_list 
    },
    report: {
      request: ['get', '_report'] ,
      handler: report
    }
  },
  Validators: {
    Patient: validate_pt
  },
  Subscription: {
    Patient: {
      handler: on_pt_change
    }
  },
  Resources: {
    Payment: {
      props: {
        amount: {type: 'number'},
        patient: {type: 'Reference'}
      }
    }
  }
});

aidbox.start();

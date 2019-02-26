const app = require('../src');

const APP_ID =  process.env.APP_ID || 'app-example';

function report(ctx) {
  return ctx.query('select count(*) FROM Attribute')
    .then((data) => Promise.resolve({count: data[0].count}));
}

const init_context = {
  env: {
    init_url: process.env.APP_INIT_URL,
    init_client_id: process.env.APP_INIT_CLIENT_ID,
    init_client_secret: process.env.APP_INIT_CLIENT_SECRET,

    app_id: APP_ID,
    app_url: process.env.APP_URL,
    app_port: process.env.APP_PORT,
    app_secret: process.env.APP_SECRET
  },
  manifest: {
    id: APP_ID,
    type: 'app',
    // subscriptions: {
    //   User: {
    //     handler: userSub
    //   }
    // },
    operations: {
      report: {
        method: 'GET',
        path: ["_report"],
        handler: report
      }
    }
  }
};

test('example app', () => {




  return app.start(init_context)
    .then((ctx) => {
      expect(ctx.manifest.id).toEqual(init_context.manifest.id);
    return ctx.request({url: '/_report', method: 'get'}).then((x)=>{
      app.stop();
      expect(x.body).toBeGreaterThan(100);
    });
  });

}, 10000);

/*
  start application with operation _report
  send request to fhir server _report and check response

  *** with sub
 */
 



var aidbox = require('../src/index.js');

function report(ctx) {
  console.log("my handler");
  return ctx.query("SELECT count(*) FROM Attribute")
    .then((data) => {
      console.log("data", data);
      ctx.response({
        body: data[0].count,
        status: 200
      });
    });
}

var APP_ID =  process.env.APP_ID || 'app-example';

var ctx = {
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
    operations: {
      report: {
        method: 'GET',
        path: ["_report"],
        handler: report
      }
    }
  }
};
console.log(ctx);
aidbox.start(ctx)
  .then(() => {
    console.log('connected to server and started');
  })
  .catch((err) => {
    console.log(err.body);
  });

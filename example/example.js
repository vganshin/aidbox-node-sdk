var aidbox = require('../src');

function report(ctx, msg) {
  console.log('my operation handler\nctx:', ctx, '\nmsg:', msg);
  return ctx.query('select count(*) FROM Attribute')
    .then((data) => {
      console.log('box response:', JSON.stringify(data, null, ' '));
      return Promise.resolve({count: data[0].count});
    });
}

function userSub(ctx, msg) {
  console.log('my userSub handler\nctx:', ctx, '\nmsg:', msg);
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
    type: 'app',
    subscriptions: {
      User: {
        handler: userSub
      }
    },
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

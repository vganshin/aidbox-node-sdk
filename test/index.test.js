const { expect } = require('chai');
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
    operations: {
      report: {
        method: 'GET',
        path: ["_report"],
        handler: report
      }
    }
  }
};

let ctx = null;

describe('example app', () => {
  before(async () => {
    ctx = await app.start(init_context);
  })
  after(() => {
    app.stop();
  });

  it('context', async () => {
    expect(ctx.manifest.id).to.equal(init_context.manifest.id);
  });

  it('get /_report', async () => {
    const body = await ctx.request({ url: '/_report', method: 'get' });
    expect(body).to.be.an('object').and.have.property('count');
  });
});

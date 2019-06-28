const { expect } = require('chai');
const request = require('request');
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
    app_url: process.env.APP_HOST,
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

const AUTH_HEADER = 'cm9vdDpzZWNyZXQ=';

function timeout(ms) {
  return new Promise(r => setTimeout(() => r(), ms));
}

const pingAidbox = (n = 0) => {
  console.log(`Connecting to aidbox... ${init_context.env.init_url}`);
  return new Promise((resolve, reject) => {
    const response = async (err, resp, body) => {
      if (err) {
        console.log('Error connecting: ', err.message);
        if (n > 10) {
          return reject('Cannot connect to Aidbox');
        }
        await timeout(5000);
        return pingAidbox(n + 1);
      }
      console.log('Connected to Aidbox');
      return resolve();
    };
    return request({
      method: 'get',
      url: `${init_context.env.init_url}/Patient`,
      auth: {
        user: init_context.env.init_client_id,
        pass: init_context.env.init_seceret
      }
    }, response)
  });
};

describe('example app', () => {
  before(async function () {
    this.timeout(11 * 5000);
    await pingAidbox();
  })
  after(async () => {
    app.stop();
  });

  it('register app', (done) => {
    app.start(init_context)
      .then((c) => {
        expect(c).to.be.an('object');
        ctx = c;
        done();
      })
      .catch(done);
  });

  it('context', async () => {
    expect(ctx.manifest.id).to.equal(init_context.manifest.id);
  });

  it('get /_report', async () => {
    const body = await ctx.request({ url: '/_report', method: 'get' });
    expect(body).to.be.an('object').and.have.property('count');
  });
});

const EventEmitter = require('events');

const app = require('../src');

const { init_context, pingAidbox, timeout } = require('./utils');

let ctx = null;

async function mockReq (c, query) {
  class MyEmitter extends EventEmitter {}
  const rq = new MyEmitter();
  const rs = {
    statusCode: null,
    headers: {},
    result: null,
    setHeader(p, v) {
      rs.headers[p] = v;
    },
    end(v) {
      rs.result = v;
    }
  };
  c.dispatch(c.ctx, rq, rs);
  rq.headers = {
    authorization: `Basic ${Buffer.from(`${c.ctx.env.app_id}:${c.ctx.env.app_secret}`).toString('base64')}`
  };
  rq.emit('data', query)
  rq.emit('end');
  while(rs.statusCode === null) {
    await timeout(500);
  }
  return Promise.resolve(rs);
}

beforeAll(async () => {
  await pingAidbox();
}, 5000 * 11);

test('register app', async () => {
  expect.assertions(3);
  const c = { ...init_context };
  c.debug = true;
  ctx = await app(c);
  expect(ctx.manifest).toEqual(init_context.manifest);
  expect(ctx.stop).toEqual(expect.any(Function));
  await expect(ctx.query(`truncate patient;delete from "user" where id = 'test';select * from "user";`)).resolves.toHaveLength(3);
});

test('register app withoutServer', async () => {
  expect.assertions(8);
  const ic = { ...init_context };
  ic.debug = true;
  ic.withoutServer = true;
  ic.manifest.operations.test_error = {
    method: 'GET',
    path: ["_testError"],
    handler() {
      throw new Error('handle error');
    }
  };
  ic.manifest.operations.test_error_2 = {
    method: 'GET',
    path: ["_testError2"],
    handler() {
      return Promise.reject('handle error 2');
    }
  };
  ic.manifest.operations.test_error_3 = {};
  await expect(app(ic)).resolves.toMatchObject({
    ctx: expect.any(Object),
    dispatch: expect.any(Function),
    init_manifest: expect.any(Function)
  });
  let c = await app(ic);

  await expect(mockReq(c, '{"type": "subscription", "handler": "unknown"}'))
    .resolves
    .toMatchObject({
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":404,"message":"Subscription [unknown] not found"}'
    });

  await expect(mockReq(c, 'wrong'))
    .resolves
    .toMatchObject({
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":500,"message":"SyntaxError: Unexpected token w in JSON at position 0"}'
    });

  await expect(mockReq(c, '{"type": "operation", "operation": { "id": "not-found" } }'))
    .resolves
    .toMatchObject({
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":404,"message":"Operation [not-found] not found"}'
    });

  await expect(mockReq(c, '{"type": "operation", "operation": { "id": "test_error" } }'))
    .resolves
    .toMatchObject({
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":500,"message":"Error: handle error"}'
    });

  await expect(mockReq(c, '{"type": "operation", "operation": { "id": "test_error_3" } }'))
    .resolves
    .toMatchObject({
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":500,"message":"Operation [test_error_3] handler not found"}'
    });

  await expect(mockReq(c, '{"type": "operation", "operation": { "id": "test_error_2" } }'))
    .resolves
    .toMatchObject({
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":500,"message":"handle error 2"}'
    });

  await expect(mockReq(c, '{"type": "wrong-type" }'))
    .resolves
    .toMatchObject({
      statusCode: 422,
      headers: {
        'Content-Type': 'application/json'
      },
      result: '{"status":422,"message":"Unknown message type [wrong-type]"}'
    });

});

test('register app in already use port', async () => {
  expect.assertions(1);
  await expect(app({ ...init_context }))
    .rejects
    .toThrow();
});

test('get /_report', async () => {
  expect.assertions(1);
  await expect(ctx.request({ url: '/_report' }))
    .resolves
    .toMatchObject({ count: expect.any(Number) });
});

test('subscription', async () => {
  expect.assertions(8);
  const user = {
    resourceType: 'User',
    name: { formatted: 'Test User' },
    email: 'test@user.com',
    password: 'test',
    id: 'test'
  };

  await expect(ctx.request({ url: '/User', method: 'post', body: user  }))
    .resolves.toMatchObject({ ...user, password: expect.any(String) });

  await timeout(2000);

  const res = await ctx.request({ url: '/Patient' });
  expect(res).toMatchObject({ resourceType: 'Bundle', type: 'searchset' });
  expect(res.entry).toHaveLength(1);
  await expect(ctx.request({ url: '/User/test' }))
    .resolves
    .toMatchObject({
      ...user,
      password: expect.any(String),
      data: { patient: expect.any(String) }
    });
  await expect(ctx.request({ url: '/User/test', method: 'delete' }))
    .resolves
    .toMatchObject({
      ...user,
      password: expect.any(String),
      data: { patient: expect.any(String) }
    });
  await expect(ctx.request({ url: '/User/test' }))
    .rejects
    .toMatchObject({
      body: {
        id: 'deleted',
        resourceType: 'OperationOutcome',
        text: {
          status: 'generated',
          div: 'Resource User/test not found'
        },
      }});

  await expect(ctx.request({ url: '/User', method: 'post', body: user  }))
    .resolves.toMatchObject({ ...user, password: expect.any(String) });
  await timeout(2000);
  await expect(ctx.request({ url: '/User/test' }))
    .resolves
    .toMatchObject({
      ...user,
      password: expect.any(String),
      data: { patient: expect.any(String) }
    });
});

test('wrong request', async () => {
  expect.assertions(1);
  await expect(ctx.request({ url: '/wrong-url', method: 'wrong' }))
    .rejects
    .toThrow('socket hang up');
});

test('app server was stopped', (done) => {
  ctx.stop(done);
});

test('register app wrong manifest', async () => {
  expect.assertions(1);
  const c = { ...init_context };
  c.env.app_url = 'http://wrong-url';
  c.env.app_port = 9999;
  await expect(app(c))
    .rejects
    .toMatchObject({
      statusCode: 500,
      body: {
        id: "exception",
        issue: [{
          code: "exception",
          diagnostics: "nil",
          severity: "fatal"
        }]
      }
    });
}, 1000 * 15);

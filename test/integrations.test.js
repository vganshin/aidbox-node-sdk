const app = require('../src');

const { init_context, pingAidbox, timeout } = require('./utils');

let ctx = null;

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
  expect.assertions(1);
  const ic = { ...init_context };
  ic.withoutServer = true;
  await expect(app(ic)).resolves.toMatchObject({
    ctx: expect.any(Object),
    dispatch: expect.any(Function),
    init_manifest: expect.any(Function)
  });
});

test('register app in already use port', async () => {
  expect.assertions(1);
  await expect(app({ ...init_context })).rejects.toThrow('listen EADDRINUSE: address already in use 0.0.0.0:8989');
});


test('get /_report', async () => {
  expect.assertions(1);
  await expect(ctx.request({ url: '/_report' })).resolves.toMatchObject({ count: expect.any(Number) });
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
      body: { message: 'wrong-url: Name or service not known' }
    });
});

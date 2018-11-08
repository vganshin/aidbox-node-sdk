var app = require('../src/example');

test('example app', ()=> {

  expect.assertions(2);

  return app.start().then((ctx)=>{
    expect(ctx.manifest.id).toEqual('myapp');
    return ctx.request({url: '/_report', method: 'get'}).then((x)=>{
      app.stop();
      expect(x.body).toBeGreaterThan(100);
    });
  });

}, 10000);

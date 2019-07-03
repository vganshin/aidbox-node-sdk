const request = require('../src/request');
const http = require('http');

test('get http://postman-echo.com/get', async () => {
  const params = {
    url: 'http://postman-echo.com/get'
  };
  await expect(request(params)).resolves.toMatchObject({
    statusCode: 200,
    headers: {},
    body: expect.any(String)
  });
});

test('get http://postman-echo.com/get', async () => {
  const params = {
    url: 'http://postman-echo.com/get'
  };
  await expect(request(params)).resolves.toMatchObject({
    statusCode: 200,
    headers: {},
    body: expect.any(String)
  });
});

test('get/json http://postman-echo.com/get?key=val', async () => {
  const params = {
    url: 'http://postman-echo.com/get?key=val',
    json: true
  };
  await expect(request(params)).resolves.toMatchObject({
    statusCode: 200,
    headers: {},
    body: {
      args: {
        key: 'val'
      },
      headers: {
        'content-type': 'application/json'
      }
    }
  });
});

test('post http://postman-echo.com/post', async () => {
  const params = {
    url: 'http://postman-echo.com/post',
    method: 'post',
    body: 'string'
  };
  await expect(request(params)).resolves.toMatchObject({
    statusCode: 200,
    headers: {},
    body: expect.any(String)
  });
});

test('post/json http://postman-echo.com/post', async () => {
  const params = {
    url: 'http://postman-echo.com/post',
    method: 'post',
    json: true,
    body: {
      key: 'val'
    }
  };
  await expect(request(params)).resolves.toMatchObject({
    statusCode: 200,
    headers: {},
    body: {
      args: {},
      data: {
        key: 'val'
      },
      headers: {
        'content-type': 'application/json'
      }
    }
  });
});

test('get wrong hostname', async () => {
  const params = {
    url: 'http://localhost:3334'
  };
  await expect(request(params)).rejects.toThrow();
});

let srv = null;
beforeEach(() => {
  srv = http.createServer((req, res) => {
    if ('authorization' in req.headers) {
      return res.end('ok');
    }
    return res.end('wrong');
  });
  srv.listen(3133);
});
afterEach(() => {
  srv.close();
});
test('received wrong json', async () => {
  const params = {
    url: 'http://localhost:3133',
    json: true
  };
  await expect(request(params)).rejects.toThrow(
    'Unexpected token w in JSON at position 0'
  );
});
test('request with auth', async () => {
  const params = {
    url: 'http://localhost:3133',
    auth: {
      user: 'user',
      pass: 'pass'
    }
  };
  await expect(request(params)).resolves.toMatchObject({
    statusCode: 200,
    headers: {},
    body: 'ok'
  });
});

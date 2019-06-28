const request = require('request');
const APP_ID =  process.env.APP_ID;

function report(ctx) {
  return ctx.query('select count(*) FROM Attribute').then(data => {
    return Promise.resolve({ count: data[0].result[0].count });
  });
}

async function userSub(ctx, msg) {
  const {
    event: { action, resource }
  } = msg;
  if (action === 'create') {
    try {
      if (
        !resource.name.familyName &&
        !resource.name.givenName &&
        resource.name.formatted
      ) {
        const [givenName, familyName] = resource.name.formatted.split(' ');
        resource.name.familyName = familyName;
        resource.name.givenName = givenName;
      }
      const patientRes = {
        resourceType: 'Patient',
        name: [
          {
            family: resource.name.familyName,
            given: [resource.name.givenName]
          }
        ],
        telecom: [{ value: resource.email, use: 'home', system: 'email' }]
      };
      const patients = await ctx.request({
        url: '/fhir/Patient/$match',
        method: 'post',
        body: {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'resource',
              resource: patientRes
            }
          ]
        }
      });
      let patient = null;
      if (patients.total > 0) {
        patient = `Patient/${patients.entry[0].resource.id}`;
      } else {
        const patientReq = await ctx.request({
          url: '/fhir/Patient',
          method: 'post',
          body: patientRes
        });
        patient = `Patient/${patientReq.id}`;
      }
      if (patient) {
        if (!resource.data) {
          resource.data = {};
        }
        resource.data.patient = patient;
        await ctx.request({
          url: `/fhir/User/${resource.id}`,
          method: 'put',
          body: resource
        });
        Promise.resolve();
      }
    } catch (err) {
      Promise.reject(err);
    }
  }
}

function timeout(ms) {
  return new Promise(r => setTimeout(() => r(), ms));
}

function pingAidbox(n = 0) {
  console.log(`Connecting to aidbox... ${init_context.env.init_url}`);
  return new Promise((resolve, reject) => {
    const response = async (err) => {
      if (err) {
        console.log('Error connecting: ', err.message);
        if (n > 10) {
          return reject('Cannot connect to Aidbox');
        }
        await timeout(5000);
        return resolve(pingAidbox(n + 1));
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

module.exports = {
  report,
  userSub,
  init_context,
  pingAidbox,
  timeout
}

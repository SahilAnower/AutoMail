const axios = require('axios');
const qs = require('qs');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

let data = qs.stringify({
  code: '4/0AbUR2VMiOqW9vbIEoIbljJ7JfHdDChc-hCPegWleYIe9NBe-wMZ9S_BcIatkoWTbW4pIKg',
  // code got through getCodeFirstTime request.
  client_id: clientId,
  client_secret: clientSecret,
  redirect_uri: 'http://localhost',
  grant_type: 'authorization_code',
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://accounts.google.com/o/oauth2/token',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  data: data,
};

// gives us the refresh token, through which we can generate our access_token each time, when hitting gmail apis.

axios
  .request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });

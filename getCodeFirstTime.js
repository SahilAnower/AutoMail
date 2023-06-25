import axios from 'axios';

const clientId = process.env.CLIENT_ID;

let config = {
  method: 'get',
  maxBodyLength: Infinity,
  url: `https://accounts.google.com/o/oauth2/v2/auth?scope=https://mail.google.com&access_type=offline&redirect_uri=http://localhost&response_type=code&client_id=${clientId}`,
};

// we need to paste this url on chrome/firefox and then, it will give back the code, which we need for further use.

axios
  .request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });

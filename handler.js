const https = require('http');
const axios = require('axios');

const baseURL = "https://restmock.techgig.com";

module.exports = {
  sendPost: async function (URL,data) {
  	console.log(URL,data);

    let headers = {
         'content-type': 'application/json',
     }


    let response = await axios
      .post(baseURL+ URL, data, {
        headers: headers,
      })
      .catch(function (error) {
        console.log(error);
        return {
          status: 'error',
          message: error,
        };
      });


    return response.data ? response.data : {} ;

  	
  },
};

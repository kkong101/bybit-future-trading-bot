const axios = require("axios");
const SECRET = require("../SECRET.json");
const { getSignature } = require("../utils/index");

module.exports = {
  getAxios: async (api_url, param) => {
    console.log("########## getAxios 호출 ##########", param?.symbol);
    console.log("api_url", api_url);
    console.log("####################################");
    const base_url = SECRET.mode == "test" ? SECRET.url.test : SECRET.url.live;
    const now = Date.now().toString();
    // const test = await axios.get(base_url + "/v2/public/time");
    // const now = parseInt(parseFloat(test.data.time_now) * 1000);
    const API =
      SECRET.mode == "live" ? SECRET.bybit.API_KEY : SECRET.bybit_test.API_KEY;
    // api_key&timestamp&sign 은 넣어줌
    const sign = getSignature({
      ...param,
      api_key: API,
      timestamp: now,
    });

    param = {
      ...param,
      api_key: API,
      sign: sign,
      timestamp: now,
    };

    let orderedParams = "";
    Object.keys(param)
      .sort()
      .forEach((key) => {
        orderedParams += key + "=" + param[key] + "&";
      });

    orderedParams = "?" + orderedParams.substr(0, orderedParams.length - 1);
    try {
      const res = await axios.get(base_url + api_url + orderedParams);
      return res.data;
    } catch (error) {
      console.log("####### getAxios err ", error);
      return null;
    }
  },
  postAxios: async (api_url, param) => {
    console.log("########## postAxios 호출 ##########", param?.symbol);
    console.log("api_url", api_url);
    console.log("####################################");
    const base_url = SECRET.mode == "test" ? SECRET.url.test : SECRET.url.live;
    const API =
      SECRET.mode == "live" ? SECRET.bybit.API_KEY : SECRET.bybit_test.API_KEY;
    const timestamp = Date.now().toString();
    // const test = await axios.get(base_url + "/v2/public/time");
    // const timestamp = parseInt(parseFloat(test.data.time_now) * 1000);
    const params = {
      ...param,
      timestamp: timestamp,
      api_key: API,
    };

    params["sign"] = getSignature(params);

    try {
      const res = await axios.post(base_url + api_url, params);
      return res.data;
    } catch (error) {
      console.log("####### postAxios err ", error);
      return null;
    }
  },
};

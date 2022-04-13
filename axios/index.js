const axios = require("axios");
const SECRET = require("../SECRET.json");
const { getSignature } = require("../utils/index");

module.exports = {
  getAxios: async (api_url, param) => {
    const base_url = SECRET.mode == "test" ? SECRET.url.test : SECRET.url.live;
    const now = Date.now().toString();

    // api_key&timestamp&sign 은 넣어줌
    const sign = getSignature({
      ...param,
      api_key: SECRET.bybit.API_KEY,
      timestamp: now,
    });

    param = {
      ...param,
      api_key: SECRET.bybit.API_KEY,
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

    const res = await axios.get(base_url + api_url + orderedParams);
    return res.data;
  },
  postAxios: async (api_url, param) => {
    const base_url = SECRET.mode == "test" ? SECRET.url.test : SECRET.url.live;

    const timestamp = Date.now().toString();

    const params = {
      ...param,
      timestamp: timestamp,
      api_key: SECRET.bybit.API_KEY,
    };

    params["sign"] = getSignature(params);

    const res = await axios.post(base_url + api_url, params);
    return res.data;
  },
};

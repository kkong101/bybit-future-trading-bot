const crypto = require("crypto");
const SECRET = require("../SECRET.json");
const COINS = require("../COINS.json");
const TRADE = require("../TRADE.json");
const { coin_info } = require("../globalState/index");
const { getAxios } = require("../axios/index");

module.exports = {
  getSignature: (param) => {
    let orderedParams = "";
    Object.keys(param)
      .sort()
      .forEach((key) => {
        orderedParams += key + "=" + param[key] + "&";
      });

    orderedParams = orderedParams.substring(0, orderedParams.length - 1);

    return crypto
      .createHmac(
        "sha256",
        SECRET.mode == "live"
          ? SECRET.bybit.API_SECRET
          : SECRET.bybit_test.API_SECRET
      )
      .update(orderedParams)
      .digest("hex");
  },
  getPercentage: (current_price, market_price) => {
    const percentage = 1 - current_price / market_price;
    return percentage < 1 ? percentage * -1 : percentage - 1;
  },
  checkNullish: (res) => {
    if (res == null || res == undefined) {
      console.log("##### err Null or undefined 발견");
      console.log(res);
      return true;
    } else {
      return false;
    }
  },
};

const crypto = require("crypto");
const SECRET = require("../SECRET.json");

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
      .createHmac("sha256", SECRET.bybit.API_SECRET)
      .update(orderedParams)
      .digest("hex");
  },
  getPercentage: (current_price, market_price) => {
    const percentage = 1 - current_price / market_price;
    return percentage < 1 ? percentage * -1 : percentage - 1;
  },
};

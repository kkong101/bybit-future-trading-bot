const { getAxios, postAxios } = require("./http/index");
const { setBBInfo } = require("./indicator/index");
const { create_one_position } = require("./trade/order");
const { getSecretInfo, getPercentage } = require("./utils/index");

const ewfwef = async () => {
  const market_price = 100;
  const entry_price = 101;
  const side = "Sell";
  const test = getPercentage(market_price, entry_price, side);

  console.log(test);

  const test22 = getPercentage(market_price, entry_price, "Buy");
  console.log(test22);
};

ewfwef();

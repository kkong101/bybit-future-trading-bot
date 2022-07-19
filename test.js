const { getAxios, postAxios } = require("./http/index");
const { setBBInfo } = require("./indicator/index");
const { create_one_position } = require("./trade/order");
const { getSecretInfo, getPercentage } = require("./utils/index");

const ewfwef = async () => {
  const symbol = "NEARUSDT";
  const res = await getAxios("/private/linear/position/list", {
    symbol: symbol,
  });
  if (res?.result && res.result?.length != 0) {
    for (const position of res.result) {
      if (parseFloat(position.size) != 0) {
        console.log("1111");
        console.log(position);
      } else {
        console.log("2222");
      }
    }
  }
};

ewfwef();

const { postAxios, getAxios } = require("../http/index");
const { isWellContacted } = require("../utils/index");
const { trade } = require("../globalState/index");

module.exports = {
  set_isolated_mode: async (symbol, type) => {
    if (type === "switch") {
      await postAxios("/private/linear/position/switch-isolated", {
        symbol: symbol,
        is_isolated: true,
        buy_leverage: trade.leverage,
        sell_leverage: trade.leverage,
      });
    } else if (type === "new") {
      await postAxios("/private/linear/position/set-leverage", {
        symbol: symbol,
        buy_leverage: trade.leverage,
        sell_leverage: trade.leverage,
      });
    }
  },
  get_current_price: async (symbol) => {
    const res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: Math.ceil(Date.now() / 1000 - 100),
    });
    if (!isWellContacted(res)) return false;

    const current_price = parseFloat(res.result[0].close);

    return current_price;
  },
};

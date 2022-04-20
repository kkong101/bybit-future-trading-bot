const { cancelAll, setBalance } = require("../trade/deposit");
const { coin_info, on_position_coin_list } = require("../globalState/index");
const { trade } = require("../globalState/index");
const TRADE = require("../TRADE.json");
const {
  order_long_position,
  replace_order,
  order_short_position,
  close_one_position,
  close_all_position,
  create_limit_order,
} = require("../trade/order");

const {
  check_limit_order_list,
  check_on_position_list,
  check_position_change,
} = require("../setInfo/index");

module.exports = {
  /**
   * 거래가 체결될 시 coin_list, on_position_list를 업데이트하고 추가 작동함
   */
  realtime_update: async (symbol) => {
    const coinObject = coin_info.find((coin) => coin.symbol == symbol);

    // coinObject.order.length > 4  return 하고 에러

    if (coinObject) {
      setTimeout(async () => {
        const side = await check_on_position_list(symbol);

        if (side == "Buy" || side == "Sell") {
          setTimeout(async () => {
            await close_one_position(symbol, side);
            await setBalance();
          }, 15 * 1000);
        }

        await check_limit_order_list(symbol);

        await check_position_change(symbol);

        await setBalance();

        return true;
      }, 8000);
    }
  },
};

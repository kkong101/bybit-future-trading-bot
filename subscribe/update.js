const { cancelAll, setBalance } = require("../trade/deposit");
const {
  coin_info,
  on_position_coin_list,
  trade,
} = require("../globalState/index");
const {
  check_limit_order_list,
  check_on_position_list,
  check_position_change,
  check_position_order,
} = require("../setInfo/index");

module.exports = {
  /**
   * 거래가 체결될 시 coin_list, on_position_list를 업데이트하고 추가 작동함
   */
  check_order: async (symbol) => {
    // const coinObject = coin_info.find((coin) => coin.symbol == symbol);
    // if (coinObject) {
    //   await check_on_position_list(symbol);
    //   await check_limit_order_list(symbol);
    // }
  },
  check_send_order: async (symbol) => {
    trade.is_onCreate_order = true;
    const coinObject = coin_info.find((coin) => coin.symbol == symbol);

    if (coinObject) {
      await check_on_position_list(symbol);
      await check_limit_order_list(symbol);

      await check_position_change(symbol);

      await check_position_order(symbol);

      await setBalance();
    }

    trade.is_onCreate_order = false;
  },
};

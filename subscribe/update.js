const { setBalance } = require("../trade/deposit");
const { coin_info } = require("../globalState/index");
const {
  check_limit_order_list,
  check_on_position_list,
  check_position_change,
  check_position_order,
} = require("../setInfo/index");

module.exports = {
  /**
   * queue에서 처리할 symbol이 넘어옴.
   * @param {*} symbol
   */
  check_send_order: async (symbol) => {
    const coinObject = coin_info.find((coin) => coin.symbol == symbol);
    if (coinObject) {
      // 체결된 position들 체크함.
      await check_on_position_list(symbol);

      // limit_order들 체크
      await check_limit_order_list(symbol);

      // 1,2,3,4번 limit_order들 위치 체크
      await check_position_change(symbol);

      // 포지션 정리할거 있는지 체크
      await check_position_order(symbol);
    }
  },
};

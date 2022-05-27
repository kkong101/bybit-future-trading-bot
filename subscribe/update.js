const { setBalance } = require("../trade/deposit");
const { coin_info } = require("../globalState/index");
const {
  check_limit_order_list,
  check_on_position_list,
  check_position_change,
  check_position_order,
} = require("../setInfo/index");
const { on_position_coin_list } = require("../globalState/index");

module.exports = {
  /**
   * queue에서 처리할 symbol이 넘어옴.
   * @param {*} symbol
   */
  check_send_order: async (symbol) => {
    const coinObject = coin_info.find((coin) => coin.symbol == symbol);
    console.log("###### check_send_order() 시작 ####");
    if (coinObject) {
      for (const tt of on_position_coin_list) {
        console.log(
          tt.symbol,
          "구매한지 얼마나 지남? => ",
          Date.now() - tt.time
        );
      }

      // 체결된 position들 체크함.
      await check_on_position_list(symbol);

      // limit_order들 체크
      await check_limit_order_list(symbol);

      // 1,2,3,4번 limit_order들 위치 체크
      await check_position_change(coinObject);
    }
  },
};

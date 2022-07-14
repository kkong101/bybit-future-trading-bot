const { getAxios } = require("../http/index");
const { isWellContacted } = require("../utils/index");
const { white_list } = require("../COINS.json");
const { coin_info } = require("../globalState/index");
const { get_current_price } = require("../trade/set");

module.exports = {
  /**
   * 코인의 정보들을 초기에 세팅해줌.
   * @returns
   */
  get_coin_info: async () => {
    const res = await getAxios("/v2/public/symbols");

    if (isWellContacted(res)) {
      for (const result of res.result) {
        const coinObj = white_list.find((wl) => wl.symbol == result.name);
        if (coinObj) {
          const current_price = await get_current_price(result.name);
          if (current_price === null) return;

          coin_info.push({
            symbol: result.name,
            tick_size: parseFloat(result.price_filter.tick_size),
            min_price: parseFloat(result.price_filter.min_price),
            min_trading_qty: parseFloat(result.lot_size_filter.min_trading_qty),
            qty_step: parseFloat(result.lot_size_filter.qty_step),
            previous_price: current_price,
            current_price: current_price,
            recent_try_order_time: Date.now(),
            isCrossed: false,
            up_or_down: "up",
            stop_loss_price: 0,
            order: [],
          });
        }
      }
    }
  },
};

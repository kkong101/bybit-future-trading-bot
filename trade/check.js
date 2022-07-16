const { getAxios } = require("../http/index");
const {
  isWellContacted,
  findOnPositionList,
  findOnPositionIdx,
  findCoinInfo,
} = require("../utils/index");
const { set_isolated_mode } = require("./set");
const { on_position_coin_list, trade } = require("../globalState/index");
const { white_list, } = require("../COINS.json");

module.exports = {
  /**
   * 체결된 코인 동기화
   * @param {*} symbol
   * @returns
   */
  check_on_position_list: async (symbol) => {
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });
    if (!isWellContacted(res)) return false;
    if (res?.result && res.result?.length != 0) {
      for (const position of res.result) {
        // 만약 구매한 상태라면,
        if (parseFloat(position.size) != 0) {
          const onPositionList = findOnPositionList(symbol);
          for (const onPositionObj of onPositionList) {
            if (onPositionObj !== null) {
              // 추가 포지션 진입인 경우
              onPositionObj.time = Date.now();
              onPositionObj.qty = parseFloat(position.size);
              onPositionObj.price = parseFloat(position.entry_price);
              onPositionObj.liq_price = parseFloat(position.liq_price);
            } else if (onPositionObj === null) {
              // 최초 포지션 진입인 경우
              on_position_coin_list.push({
                symbol: symbol,
                side: position.side,
                price: parseFloat(position.entry_price),
                qty: parseFloat(position.size),
                initial_qty: parseFloat(position.size),
                time: Date.now(),
                liq_price: parseFloat(position.liq_price),
              });
            }
          }
        } else {
          // 구매하지 않은 상태라면
          // on_position_coin_list에서 빼준다.
          const coinObj = findCoinInfo(symbol);
          if (coinObj === null) return false;
          coinObj.stop_loss_price = 0;
          const idx = findOnPositionIdx(symbol, position.side);
          if (idx != -1) on_position_coin_list.splice(idx, 1);
        }
      }
      /**
       * 교차인지 체크해서 만약 교차이면 isolated로 변경
       */
      let is_isolated = true;
      let is_right_leverage = true;
      for (const position of res.result) {
        if (position.size != 0 && !position.is_isolated) is_isolated = false;
        if (trade.leverage != parseFloat(position.leverage))
          is_right_leverage = false;
      }

      if (!is_isolated) set_isolated_mode(symbol, "switch");
      if (!is_right_leverage) set_isolated_mode(symbol, "new");

      /**
       * The End ###
       */
    }
  },
  /**
   * 걸려있는 주문들 정보 동기화
   * @param {*} symbol
   * @returns
   */
  check_limit_order_list: async (symbol) => {
    const coinObj = findCoinInfo(symbol);
    if (coinObj === null) return false;

    const res = await getAxios("/private/linear/order/search", {
      symbol,
    });
    if (!isWellContacted(res) && res?.result == undefined) return false;

    if (res.result?.length != 0) {
      coinObj.order = [];
      for (const order of res.result) {
        if (
          order.order_status == "New" ||
          order.order_status == "PartiallyFilled"
        ) {
          const position = order.order_link_id.split("-")[0];
          coinObj.order.push({
            id: order.order_id,
            side: position,
            price: parseFloat(order.price),
            qty: parseFloat(order.qty),
          });
        }
      }
    } else {
      coinObj.order = [];
    }
  },
};

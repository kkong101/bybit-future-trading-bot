const { on_position_coin_list } = require("../globalState");
const { getAxios, postAxios } = require("../http/index");
const { makeLog } = require("../utils/index");
const {
  findCoinInfo,
  findOrderInfo,
  isWellContacted,
  findOnPositionObj,
  findOnPositionIdx,
} = require("../utils/index");

module.exports = {
  /**
   * 신규로 주문을 넣어줌. => on_position_list에다가도 바로 넣어줌.
   * @param {*} symbol
   * @param {*} side
   * @param {*} price
   * @param {*} qty
   * @param {*} order_type
   * @returns
   */
  create_one_position: async (symbol, side, price, qty, order_type) => {
    const coinObj = findCoinInfo(symbol);
    const orderObj = findOrderInfo(coinObj, side);

    // 이미 체결되어 있으면 빠꾸
    if (orderObj) return false;

    let params = {};

    if (order_type === "Limit") {
      params = {
        side: side,
        symbol: symbol,
        order_type: order_type,
        qty: qty,
        price: price,
        time_in_force: "GoodTillCancel",
        reduce_only: false,
        close_on_trigger: false,
        order_link_id: `${side}-${Date.now()}`,
        tp_trigger_by: "LastPrice",
        sl_trigger_by: "LastPrice",
      };
    } else if (order_type === "Market") {
      params = {
        side: side,
        symbol: symbol,
        order_type: order_type,
        qty: qty,
        time_in_force: "GoodTillCancel",
        reduce_only: false,
        close_on_trigger: false,
        order_link_id: `${side}-${Date.now()}`,
        tp_trigger_by: "LastPrice",
        sl_trigger_by: "LastPrice",
      };
    }
    console.log(params);
    const res = await postAxios("/private/linear/order/create", params);
    makeLog("@@ create_one_position", "dev");
    makeLog(res, "dev");
    if (isWellContacted(res)) {
      const orderObj = findOrderInfo(coinObj, res.result?.side);
      // 만약 order_id list에 없다면 넣어주기.
      if (orderObj === null) {
        coinObj.order.push({
          id: res.result?.order_id,
          side: res.result?.side,
          price: parseFloat(res.result?.price),
          qty: parseFloat(res.result?.qty),
        });
      }
      return true;
    }
    return false;
  },
  replace_one_position: async (symbol, side, price) => {
    const coinObj = findCoinInfo(symbol);
    const orderObj = findOrderInfo(coinObj, side);

    if (orderObj === null) return false;

    const order_id = orderObj.id;

    const params = {
      symbol: symbol,
      order_id: order_id,
      p_r_price: price,
      p_r_qty: orderObj.qty,
    };

    const res = await postAxios("/private/linear/order/replace", params);
    makeLog("@@ replace_one_position", "dev");
    makeLog(res, "dev");
    if (isWellContacted(res)) return true;
    return false;
  },
  close_one_position: async (symbol, side, price, qty, order_type) => {
    const positionObj = findOnPositionObj(symbol, side);
    if (positionObj === null) return false;

    let params = {};
    if (order_type == "Limit") {
      params = {
        symbol: symbol,
        price: price,
        side: side == "Buy" ? "Sell" : "Buy",
        order_type: order_type,
        qty: qty,
        reduce_only: true,
        time_in_force: "FillOrKill",
        close_on_trigger: false,
      };
    } else if (order_type == "Market") {
      params = {
        symbol: symbol,
        side: side == "Buy" ? "Sell" : "Buy",
        order_type: order_type,
        qty: qty,
        reduce_only: true,
        time_in_force: "FillOrKill",
        close_on_trigger: false,
      };
    }
    const res = await postAxios("/private/linear/order/create", params);
    makeLog("@@ close_one_position", "dev");
    makeLog(res, "dev");
    // 판매가 완료 되었으면 => on_position_coin_list 에서 빼줌 .
    if (isWellContacted(res)) {
      const idx = findOnPositionIdx(symbol, side);
      const remain_qty =
        on_position_coin_list[idx].qty - parseFloat(res.result.qty);
      if (remain_qty <= 0) {
        on_position_coin_list.splice(idx, 1);
      } else {
        on_position_coin_list[idx].qty = remain_qty;
      }

      return true;
    }
    return false;
  },
  /**
   * 모든 체결된 것들 취소 현재 사용 X
   * @param {*} symbol
   */
  close_all_position: async (symbol) => {
    // position_list.forEach(async (e) => {
    //   const params = {
    //     symbol: e.symbol,
    //     side: e.side == "Buy" ? "Sell" : "Buy",
    //     order_type: "Market",
    //     qty: e.qty,
    //     reduce_only: true,
    //     time_in_force: "FillOrKill",
    //     close_on_trigger: false,
    //   };
    //   const res = await postAxios("/private/linear/order/create", params);
    //   if (checkNullish(res)) return;
    //   return res;
    // });
  },
  cancel_one_side_limit_order: async (symbol, side) => {
    const coinObj = findCoinInfo(symbol);
    const orderObj = findOrderInfo(coinObj, side);
    const res = await postAxios("/private/linear/order/cancel", {
      symbol: symbol,
      order_id: orderObj.id,
    });
    if (isWellContacted(res)) return true;
    makeLog("@@ cancel_one_side_limit_order", "dev");
    makeLog(res, "dev");
    return false;
  },
};

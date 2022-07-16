const { isSell_BB_Stretagy } = require("../strategy/index");
const { white_list } = require("../COINS.json");
const {
  close_one_position,
  cancel_one_side_limit_order,
  create_one_position,
  replace_one_position,
} = require("../trade/order");
const {
  findOnPositionObj,
  getCleanFloat,
  findCoinInfo,
  findOrderInfo,
  existLimitOrder,
  existOnPosition,
  getClearnQty,
} = require("../utils/index");
const { check_on_position_list } = require("../trade/check");
const { trade } = require("../globalState");

module.exports = {
  /**
   * 익절/손절 할지 체크하는 함수
   * @param {*} symbol
   * @returns
   */
  check_close_position: async (symbol) => {
    const position_list = ["Buy", "Sell"];

    for (const side of position_list) {
      const result_cond = isSell_BB_Stretagy(symbol, side);
      if (result_cond === -1) return false;
      const whiteCoinObj = white_list.find((e) => e.symbol === symbol);
      const coinObj = findCoinInfo(symbol);
      const onPositionObj = findOnPositionObj(symbol, side);

      if (whiteCoinObj === null || onPositionObj === null) return false;

      // 손절인 경우
      if (result_cond === 0) {
        const res = await close_one_position(
          symbol,
          side,
          0,
          onPositionObj.qty,
          "Market"
        );
        // 체결됬다면 on_position_list 업데이트
        if (res === true) {
          await check_on_position_list(symbol);
          coinObj.stop_loss_price = 0;
        }
      } else if (result_cond === 1) {
        // 만약 이미 부분 익절한 상태라면 return 해준다.
        if (onPositionObj.initial_qty != onPositionObj.qty) return;

        // 부분 익절
        const qty = getCleanFloat(
          onPositionObj.initial_qty * whiteCoinObj.partial_profit_qty_percent,
          coinObj.qty_step
        );

        const res = await close_one_position(symbol, side, 0, qty, "Market");
        if (res === true) {
          await check_on_position_list(symbol);

          // 손절가 부분 바꿔줌.
          coinObj.stop_loss_price = onPositionObj.price;
        }
        // 체결됬다면 on_position_list 업데이트
        if (res === true) await check_on_position_list(symbol);
      } else if (result_cond === 2) {
        // 전량 익절
        const res = await close_one_position(
          symbol,
          side,
          0,
          onPositionObj.qty,
          "Market"
        );
        // 체결됬다면 on_position_list 업데이트
        if (res === true) {
          await check_on_position_list(symbol);
          coinObj.stop_loss_price = 0;
        }
      }
    }
  },
  /**
   * limit_order를 변경하는지 체크하는 부분
   * @param {*} symbol
   */
  check_modify_order: async (symbol) => {
    const coinObj = findCoinInfo(symbol);
    if (coinObj === null) return false;

    const whiteCoinObj = white_list.find((e) => e.symbol === symbol);

    const check_side_list = ["Buy", "Sell"];

    console.log("####", coinObj);

    // 만약 체결된 거래가 없고, limit_order가 없으면 신규로 주문을 넣는다.
    if (!existLimitOrder(coinObj) && !existOnPosition(symbol)) {
      // (symbol, side, price, qty, order_type)
      let side = "Buy";
      let price = 0;
      let qty =
        (trade.total_money / coinObj.current_price) * trade.using_money_rate;

      if (coinObj.up_or_down === "up") {
        side = "Sell";
        price =
          coinObj.prev_upper +
          coinObj.prev_upper * (whiteCoinObj.order_gap / 100);
      } else {
        side = "Buy";
        price =
          coinObj.prev_lower -
          coinObj.prev_lower * (whiteCoinObj.order_gap / 100);
      }
      await create_one_position(
        symbol,
        side,
        getCleanFloat(price, coinObj.tick_size),
        getClearnQty(qty, coinObj.qty_step),
        "Limit"
      );
      return true;
    }

    for (const side of check_side_list) {
      console.log("진입#######");
      const orderObj = findOrderInfo(coinObj, side);
      console.log("$!@$", orderObj);
      if (orderObj === null) continue;
      const qty = orderObj.qty;
      if (coinObj.up_or_down === "up" && orderObj.side === "Buy") {
        // 위쪽 주문 취소하고 아래쪽으로 바꿔줘야댐.
        const res = await cancel_one_side_limit_order(symbol, side);

        if (res === true) {
          const price = getCleanFloat(
            coinObj.prev_lower -
              coinObj.prev_lower * (whiteCoinObj.order_gap / 100),
            coinObj.tick_size
          );
          console.log("진입#######11111");
          await create_one_position(symbol, "Buy", price, qty, "Limit");
        }
      } else if (coinObj.up_or_down === "down" && orderObj.side === "Sell") {
        // 아래쪽 주문 취소하고 위쪽으로 바꿔줘야댐.
        const res = await cancel_one_side_limit_order(symbol, side);
        if (res === true) {
          const price = getCleanFloat(
            coinObj.prev_upper +
              coinObj.prev_upper * (whiteCoinObj.order_gap / 100),
            coinObj.tick_size
          );
          console.log("진입#######2222");
          await create_one_position(symbol, "Sell", price, qty, "Limit");
        }
      } else if (orderObj.side === "Sell") {
        // 위쪽 주문인 경우.
        // 가격 변경을 해준다.
        const price = getCleanFloat(
          coinObj.prev_upper +
            coinObj.prev_upper * (whiteCoinObj.order_gap / 100),
          coinObj.tick_size
        );

        // 변경할 가격이 동일하다면 주문 안해줌.
        if (price == orderObj.price) return false;
        await replace_one_position(symbol, side, price);
      } else if (orderObj.side === "Buy") {
        // 아래쪽 주문인 경우
        // 가격 변경을 해준다.
        const price = getCleanFloat(
          coinObj.prev_lower -
            coinObj.prev_lower * (whiteCoinObj.order_gap / 100),
          coinObj.tick_size
        );
        if (price == orderObj.price) return false;
        await replace_one_position(symbol, side, price);
      }
    }
  },
};

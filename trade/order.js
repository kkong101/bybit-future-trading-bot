const { postAxios, getAxios } = require("../axios/index");
const {
  trade,
  coin_info,
  on_position_coin_list,
} = require("../globalState/index");
const TRADE = require("../TRADE.json");

module.exports = {
  order_long_position: async (symbol, price, order_link_id) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const order_money =
      (trade.total_money * trade.using_money_rate) /
      (TRADE.additional_position + TRADE.additional_position);

    const coinObject = coin_info.find((e) => e.symbol == symbol);

    let qty = order_money / price;

    const namo = qty % coinObject.qty_step;

    qty = qty - namo;

    if (qty < coinObject.min_trading_qty) {
      // 만약에 돈이 없다면,
      return;
    }

    const stop_loss = price - price * TRADE.close_position.loss.loss_percentage;
    const take_profit =
      price + price * TRADE.close_position.profit.profit_percentage;

    const params = {
      side: "Buy",
      symbol: symbol,
      order_type: "Limit",
      qty: qty,
      price: price,
      time_in_force: "GoodTillCancel",
      reduce_only: false,
      close_on_trigger: false,
      order_link_id: order_link_id,
      take_profit: take_profit,
      stop_loss: stop_loss,
    };

    const res = await postAxios("/private/linear/order/create", params);
    console.log("@@", res);
    return res;
  },
  order_short_position: async (symbol, price, order_link_id) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const order_money =
      (trade.total_money * trade.using_money_rate) /
      (TRADE.additional_position + TRADE.additional_position);

    const coinObject = coin_info.find((e) => e.symbol == symbol);

    let qty = order_money / price;

    const namo = qty % coinObject.qty_step;

    qty = qty - namo;
    if (qty < coinObject.min_trading_qty) {
      // 만약에 돈이 없다면,
      return;
    }

    const stop_loss = price + price * TRADE.close_position.loss.loss_percentage;
    const take_profit =
      price - price * TRADE.close_position.profit.profit_percentage;

    const params = {
      side: "Sell",
      symbol: symbol,
      order_type: "Limit",
      qty: qty,
      price: price,
      time_in_force: "GoodTillCancel",
      reduce_only: false,
      close_on_trigger: false,
      order_link_id: order_link_id,
      take_profit: take_profit,
      stop_loss: stop_loss,
    };
    const res = await postAxios("/private/linear/order/create", params);
    return res;
  },
  // const res4 = await replace_order(symbol,price, idx, 4);
  replace_order: async (symbol, price, idx, position) => {
    const coinObject = coin_info[idx];

    coin_info[idx].update_time = Date.now();

    // 얼마어치 살껀지 책정하는 부분
    const order_money =
      (trade.total_money * trade.using_money_rate) /
      (TRADE.additional_position + TRADE.additional_position);

    let order_price = price;
    // position => [1, 2, 3, 4] 체크해서. 해당되는 limit order price를 넣어줘야댐.
    const tick_size = parseFloat(coinObject.tick_size);
    const current_price = price;

    let side = "short";
    if (position == 1) {
      order_price = current_price + tick_size * TRADE.call_put_tick_size * 2;
    } else if (position == 2) {
      order_price = current_price + tick_size * TRADE.call_put_tick_size;
    } else if (position == 3) {
      order_price = current_price - tick_size * TRADE.call_put_tick_size;
      side = "long";
    } else if (position == 4) {
      order_price = current_price - tick_size * TRADE.call_put_tick_size * 2;
      side = "long";
    }

    let qty = order_money / price;

    const remain = qty % coinObject.qty_step;

    qty = qty - remain;

    if (qty < coinObject.min_trading_qty) {
      // 만약에 돈이 없다면,
      return;
    }

    let order_id;
    for (const order of coinObject.order) {
      if (order.position == position) {
        order_id = order.id;
      }
    }

    if (order_id == null) return;

    let stop_loss = 0;
    let take_profit = 0;
    // Target Profit, Stop Loss(익절, 손절) 구하는 부분
    if (side == "short") {
      stop_loss = price + price * TRADE.close_position.loss.loss_percentage;
      take_profit =
        price - price * TRADE.close_position.profit.profit_percentage;
    } else {
      // long인 경우,
      stop_loss = price - price * TRADE.close_position.loss.loss_percentage;
      take_profit =
        price + price * TRADE.close_position.profit.profit_percentage;
    }

    const params = {
      symbol: symbol,
      order_id: order_id,
      p_r_price: order_price,
      p_r_qty: qty,
      take_profit: take_profit,
      stop_loss: stop_loss,
    };

    const res = await postAxios("/private/linear/order/replace", params);
    if ((res.ret_msg = "OK")) {
      coin_info[idx].previous_price = price;
    }
    return res;
  },

  close_all_position: async () => {
    const res = await getAxios("/private/linear/position/list");

    const position_list = [];
    res.result.forEach((e) => {
      if (parseFloat(e.data.size) > 0) {
        position_list.push({
          symbol: e.data.symbol,
          side: e.data.side,
          qty: e.data.size,
        });
      }
    });

    position_list.forEach(async (e) => {
      const params = {
        symbol: e.symbol,
        side: e.side == "Buy" ? "Sell" : "Buy",
        order_type: "Market",
        qty: e.qty,
        reduce_only: true,
        time_in_force: "FillOrKill",
        close_on_trigger: false,
      };

      const res = await postAxios("/private/linear/order/create", params);

      if (res.rate_limit_status == "0") {
        // 만약 limit_rate가 전부다 한 상태라면,
        trade.is_circuit_breaker = true;

        const after_time = parseInt(res.rate_limit_reset_ms) - Date.now();
        setTimeout(async () => {
          await postAxios("/private/linear/order/create", params);

          setTimeout(() => {
            trade.is_circuit_breaker = false;
          }, 1000);
        }, after_time + 500);
      }

      return res;
    });
  },
  close_one_position: async (symbol, side) => {
    trade.is_onCreate_order = true;
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });

    const qty = parseFloat(res.result[side == "Buy" ? 0 : 1].size);
    for (const e of on_position_coin_list) {
      if (symbol == e.symbol && side == e.side) {
        const params = {
          symbol: symbol,
          side: side == "Buy" ? "Sell" : "Buy",
          order_type: "Market",
          qty: qty,
          reduce_only: true,
          time_in_force: "FillOrKill",
          close_on_trigger: false,
        };

        const res = await postAxios("/private/linear/order/create", params);

        // 판매가 완료 되었으면,  on_position_coin_list 에서 빼줌 .
        if (res.result != null) {
          const idx = on_position_coin_list.findIndex(
            (e) => e.symbol == symbol && e.side == side
          );
          console.log("삭제할 side", side);
          console.log("삭제된 idx, ", idx);
          on_position_coin_list.splice(idx, 1);

          console.log("익절 / 손절해서 on_position_list에서 제외 해줌.");
          trade.is_onCreate_order = false;
        }

        if (res.rate_limit_status == "0") {
          // 만약 limit_rate가 전부다 한 상태라면,
          trade.is_circuit_breaker = true;

          const after_time = parseInt(res.rate_limit_reset_ms) - Date.now();
          setTimeout(async () => {
            await postAxios("/private/linear/order/create", params);

            setTimeout(() => {
              trade.is_circuit_breaker = false;
              trade.is_onCreate_order = false;
            }, 1000);
          }, after_time + 500);
        }

        return res;
      } else {
        return;
      }
    }
    trade.is_onCreate_order = false;
  },
  get_current_price: async (symbol) => {
    const kline_res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: Math.ceil(Date.now() / 1000 - 100),
    });
    const current_price = parseFloat(kline_res.result[0].close);

    return current_price;
  },
  // limit_rate가 걸렸을경우 전부 대기시키고 1순위로 주문을 넣어줘야댐.
  create_limit_order: async (symbol, tick_size, order_position_list) => {
    trade.is_onCreate_order = true;
    const idx = coin_info.findIndex((e) => e.symbol == symbol);

    const thisModule = require("./order");
    const current_price = await thisModule.get_current_price(symbol);

    const high_position_price =
      current_price + tick_size * TRADE.call_put_tick_size;
    const low_position_price =
      current_price - tick_size * TRADE.call_put_tick_size;

    for (const position_order of order_position_list) {
      // 이미 해당 포지션에 거래가 존재한다면 return 시킴.
      for (const my_order of coin_info[idx].order) {
        if (position_order == my_order.position) {
          return;
        }
      }
    }

    if (order_position_list.includes(1)) {
      const short_res2 = await thisModule.order_short_position(
        symbol,
        high_position_price + tick_size * TRADE.call_put_tick_size,
        `create-short-limit-1-${Date.now()}`
      );

      if (short_res2.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: short_res2.result.order_id,
          position: 1,
        });
        trade.is_onCreate_order = false;
      }
    }
    if (order_position_list.includes(2)) {
      const short_res1 = await thisModule.order_short_position(
        symbol,
        high_position_price,
        `create-short-limit-2-${Date.now()}`
      );

      if (short_res1.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: short_res1.result.order_id,
          position: 2,
        });
        trade.is_onCreate_order = false;
      }
    }
    if (order_position_list.includes(3)) {
      const long_res1 = await thisModule.order_long_position(
        symbol,
        low_position_price,
        `create-long-limit-3-${Date.now()}`
      );
      if (long_res1.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: long_res1.result.order_id,
          position: 3,
        });
        trade.is_onCreate_order = false;
      }
    }
    if (order_position_list.includes(4)) {
      const long_res2 = await thisModule.order_long_position(
        symbol,
        low_position_price - tick_size * TRADE.call_put_tick_size,
        `create-long-limit-4-${Date.now()}`
      );
      if (long_res2.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: long_res2.result.order_id,
          position: 4,
        });
        trade.is_onCreate_order = false;
      }
    }
  },
};

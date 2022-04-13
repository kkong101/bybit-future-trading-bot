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
    console.log("여긴 지나감 ?");

    const res = await postAxios("/private/linear/order/create", params);
    console.log("@@", res);
    return res;
  },
  replace_order: async (
    symbol,
    price,
    order_id,
    market_price,
    idx,
    order_link_id
  ) => {
    coin_info[idx].update_time = Date.now();
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

    let position = "short";
    if (order_link_id.indexOf("long") != -1) position = "long";

    let stop_loss = 0;
    let take_profit = 0;
    // Target Profit, Stop Loss(익절, 손절) 구하는 부분
    if (position == "short") {
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
      p_r_price: price,
      p_r_qty: qty,
      order_link_id: order_link_id,
      take_profit: take_profit,
      stop_loss: stop_loss,
    };

    const res = await postAxios("/private/linear/order/replace", params);
    if ((res.ret_msg = "OK")) {
      coin_info[idx].previous_price = market_price;
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
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });

    const qty = parseFloat(res.result[side == "Buy" ? 0 : 1].size);

    on_position_coin_list.forEach(async (e) => {
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
      } else {
        return;
      }
    });
  },
};

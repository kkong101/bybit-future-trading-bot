const { postAxios, getAxios } = require("../axios/index");
const {
  trade,
  coin_info,
  on_position_coin_list,
} = require("../globalState/index");
const { getTargetPrice } = require("../utils/index");
const TRADE = require("../TRADE.json");
const COINS = require("../COINS.json");

module.exports = {
  order_long_position: async (symbol, price, order_link_id) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const available_balance =
      (trade.total_money * trade.using_money_rate) / (4 * coin_info.length);

    const coinObject = coin_info.find((e) => e.symbol == symbol);
    if (!coinObject) return;

    let qty = available_balance / price;

    const namo = qty % coinObject.qty_step;

    qty = qty - namo;

    if (qty < coinObject.min_trading_qty) {
      console.log("최소 수량보다 주문 수량이 더 적음..");
      // 만약에 돈이 없다면,
      return;
    }

    let precision_num = 0;
    const stringed_number = price.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    const splited = qty.toString().split(".");
    if (splited.length == 2 && splited[1].length > 6) {
      const rest = qty - qty.toFixed(5);
      qty = qty - rest;
    }

    // 청산가 정하는 부분 .
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
      take_profit: take_profit.toFixed(precision_num),
      stop_loss: stop_loss.toFixed(precision_num),
      position_idx: 1,
    };

    const res = await postAxios("/private/linear/order/create", params);
    return res;
  },
  order_short_position: async (symbol, price, order_link_id) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const available_balance =
      (trade.total_money * trade.using_money_rate) / (4 * coin_info.length);

    const coinObject = coin_info.find((e) => e.symbol == symbol);
    if (!coinObject) return;

    let qty = available_balance / price;

    const namo = qty % coinObject.qty_step;

    qty = qty - namo;

    const splited = qty.toString().split(".");
    if (splited.length == 2 && splited[1].length > 6) {
      const rest = qty - qty.toFixed(5);
      qty = qty - rest;
    }

    /**
     * qty 소수점이 길때,
     */
    if (qty < coinObject.min_trading_qty) {
      // 만약에 돈이 없다면,
      return;
    }

    let precision_num = 0;
    const stringed_number = price.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
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
      take_profit: take_profit.toFixed(precision_num),
      stop_loss: stop_loss.toFixed(precision_num),
      position_idx: 2,
    };
    const res = await postAxios("/private/linear/order/create", params);
    return res;
  },
  replace_order: async (symbol, price, idx, position) => {
    const coinObject = coin_info[idx];

    const available_balance =
      (trade.total_money * trade.using_money_rate) / (4 * coin_info.length);

    // 얼마어치 살껀지 책정하는 부분
    const order_price = getTargetPrice(symbol, price, position);

    let side = "short";
    if (position == 3) {
      side = "long";
    } else if (position == 4) {
      side = "long";
    }

    let qty = available_balance / price;

    const remain = qty % coinObject.qty_step;

    qty = qty - remain;

    if (qty < coinObject.min_trading_qty) {
      // 만약에 돈이 없다면,
      return;
    }

    const splited = qty.toString().split(".");
    if (splited.length == 2 && splited[1].length > 6) {
      const rest = qty - qty.toFixed(5);
      qty = qty - rest;
    }

    let order_id;
    for (const order of coinObject.order) {
      if (order.position == position) {
        order_id = order.id;
      }
    }

    if (order_id == null) return;

    let precision_num = 0;
    const stringed_number = price.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    let stop_loss = 0;
    let take_profit = 0;

    // Target Profit, Stop Loss(익절, 손절) 구하는 부분
    if (side == "short") {
      stop_loss =
        order_price +
        (order_price * TRADE.close_position.loss.loss_percentage) / 100;
      take_profit =
        order_price -
        (order_price * TRADE.close_position.loss.loss_percentage) / 100;
    } else {
      // long인 경우,
      stop_loss =
        order_price -
        (order_price * TRADE.close_position.loss.loss_percentage) / 100;
      take_profit =
        order_price +
        (order_price * TRADE.close_position.loss.loss_percentage) / 100;
    }

    stop_loss = stop_loss.toFixed(precision_num);
    take_profit = take_profit.toFixed(precision_num);

    const params = {
      symbol: symbol,
      order_id: order_id,
      p_r_price: order_price,
      p_r_qty: qty,
      take_profit: take_profit,
      stop_loss: stop_loss,
    };

    const res = await postAxios("/private/linear/order/replace", params);

    if (res.ret_code == 0) {
      console.log(symbol, "## 가격 업데이트 ###### position =>", position);
      console.log("현재가 => ", price, "주문가 => ", order_price);
      console.log("## rate_limit", res.rate_limit_status, "###############");
      console.log("## rate_limit", res, "###############");
      coin_info[idx].previous_price = price;
      coin_info[idx].update_time = Date.now();
      return true;
    } else {
      console.log(symbol, position, "##### REPLACE_ORDER 실패 #####");
      console.log("/private/linear/order/replace", res);
      console.log("####################################");
      console.log(params);
      console.log("####################################");
    }
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
        }

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
    }
  },
  get_current_price: async (symbol) => {
    const kline_res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: Math.ceil(Date.now() / 1000 - 100),
    });
    if (kline_res.ret_code == "10001")
      console.log("COINS에 코인 이름을 다시한번 확인해주세요.");
    const current_price = parseFloat(kline_res.result[0].close);

    return current_price;
  },
  // limit_rate가 걸렸을경우 전부 대기시키고 1순위로 주문을 넣어줘야댐.
  create_limit_order: async (symbol, tick_size, order_position_list) => {
    const thisModule = require("./order");

    const idx = coin_info.findIndex((e) => e.symbol == symbol);
    if (idx == -1) return;
    const current_price = await thisModule.get_current_price(symbol);

    const order_price_list = [];

    for (const position of order_position_list) {
      const target_price = getTargetPrice(symbol, current_price, position);
      order_price_list.push({
        position: position,
        price: target_price,
      });
    }

    for (const position_order of order_position_list) {
      // 이미 해당 포지션에 거래가 존재한다면 return 시킴.
      for (const my_order of coin_info[idx].order) {
        if (position_order == my_order.position) {
          return;
        }
      }
    }

    if (
      order_position_list.includes(1) &&
      !coin_info[idx].order.find((e) => e.position == 1)
    ) {
      order_price = order_price_list.find((e) => e.position == 1);
      const short_res2 = await thisModule.order_short_position(
        symbol,
        order_price.price,
        `create-short-limit-1-${Date.now()}`
      );

      console.log(symbol, "short_res2", short_res2);

      if (short_res2 && short_res2.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: short_res2.result.order_id,
          position: 1,
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("short_res2 err !!!!!");
      }
    }
    if (
      order_position_list.includes(2) &&
      !coin_info[idx].order.find((e) => e.position == 2)
    ) {
      order_price = order_price_list.find((e) => e.position == 2);
      const short_res1 = await thisModule.order_short_position(
        symbol,
        order_price.price,
        `create-short-limit-2-${Date.now()}`
      );
      console.log(symbol, "short_res1", short_res1);

      if (short_res1 && short_res1.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: short_res1.result.order_id,
          position: 2,
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("short_res1 err!!!");
      }
    }
    if (
      order_position_list.includes(3) &&
      !coin_info[idx].order.find((e) => e.position == 3)
    ) {
      order_price = order_price_list.find((e) => e.position == 3);
      const long_res1 = await thisModule.order_long_position(
        symbol,
        order_price.price,
        `create-long-limit-3-${Date.now()}`
      );

      console.log(symbol, "long_res1", long_res1);
      if (long_res1 && long_res1.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: long_res1.result.order_id,
          position: 3,
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("long_res1 err");
      }
    }
    if (
      order_position_list.includes(4) &&
      !coin_info[idx].order.find((e) => e.position == 4)
    ) {
      order_price = order_price_list.find((e) => e.position == 4);
      const long_res2 = await thisModule.order_long_position(
        symbol,
        order_price.price,
        `create-long-limit-4-${Date.now()}`
      );

      console.log(symbol, "long_res2", long_res2);

      if (long_res2 && long_res2.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: long_res2.result.order_id,
          position: 4,
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("long_res2 err");
      }
    }
  },
};

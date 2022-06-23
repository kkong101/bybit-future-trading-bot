const { postAxios, getAxios } = require("../axios/index");
const {
  trade,
  coin_info,
  on_position_coin_list,
} = require("../globalState/index");
const { checkNullish } = require("../utils/index");
const COINS = require("../COINS.json");
const TRADE = require("../TRADE.json");

module.exports = {
  order_long_position: async (symbol, price, order_link_id, idx) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const available_balance =
      (trade.total_money * trade.using_money_rate) / coin_info.length;

    const coinObject = coin_info[idx];

    const COIN_JSON_INFO = COINS.white_list.find((e) => e.symbol == symbol);

    let qty = available_balance / price;

    const namo = qty % coinObject.qty_step;

    qty = qty - namo;

    if (qty < coinObject.min_trading_qty) {
      console.log("최소 수량보다 주문 수량이 더 적음..");
      // 만약에 돈이 없다면,
      return;
    }

    let precision_num = 0;
    const stringed_number = coin_info[idx].current_price.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    const splited = qty.toString().split(".");
    if (splited.length == 2 && splited[1].length > 6) {
      const rest = qty - qty.toFixed(5);
      qty = qty - rest;
    }

    const params = {
      side: "Buy",
      symbol: symbol,
      order_type: "Limit",
      qty: qty,
      price: price.toFixed(precision_num),
      time_in_force: "GoodTillCancel",
      reduce_only: false,
      close_on_trigger: false,
      order_link_id: order_link_id,
      tp_trigger_by: "LastPrice",
      sl_trigger_by: "LastPrice",
    };
    console.log(params);
    const res = await postAxios("/private/linear/order/create", params);
    if (checkNullish(res)) return;
    return res;
  },
  order_short_position: async (symbol, price, order_link_id, idx) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const available_balance =
      (trade.total_money * trade.using_money_rate) / coin_info.length;

    const coinObject = coin_info[idx];

    const COIN_JSON_INFO = COINS.white_list.find((e) => e.symbol == symbol);

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
    const stringed_number = coin_info[idx].current_price.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    const params = {
      side: "Sell",
      symbol: symbol,
      order_type: "Limit",
      qty: qty,
      price: price.toFixed(precision_num),
      time_in_force: "GoodTillCancel",
      reduce_only: false,
      close_on_trigger: false,
      order_link_id: order_link_id,
      tp_trigger_by: "LastPrice",
      sl_trigger_by: "LastPrice",
    };
    console.log(params);
    const res = await postAxios("/private/linear/order/create", params);
    if (checkNullish(res)) return;
    return res;
  },
  replace_order: async (symbol, price, idx, position) => {
    const coinObject = coin_info[idx];
    if (!coinObject.order.find((e) => e.position == position)) return;

    const available_balance =
      (trade.total_money * trade.using_money_rate) / (2 * coin_info.length);

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
    for (const order of coin_info[idx].order) {
      if (order.position == position) {
        order_id = order.id;
      }
    }

    if (order_id == null) return;

    // 얼마어치 살껀지 책정하는 부분
    const thisModule = require("./order");
    const order_price = await thisModule.getTargetPrice(
      symbol,
      price,
      position
    );

    // 동일한 가격으로 수정 방지
    for (const order of coin_info[idx].order) {
      if (order.position == position) {
        if (order.price == order_price) {
          console.log("## replace_order 가격이 동일하여 skip11");
          return;
        } else if (coin_info[idx].previous_price == price) {
          console.log("## replace_order 가격이 동일하여 skip22");
          return;
        }
      }
    }

    const params = {
      symbol: symbol,
      order_id: order_id,
      p_r_price: order_price,
      p_r_qty: qty,
    };

    const res = await postAxios("/private/linear/order/replace", params);
    if (checkNullish(res)) return;

    if (res?.ret_code == 0) {
      // console.log(symbol, "## 가격 업데이트 성공 ###### position =>", position);
      // console.log("현재가 => ", price, "주문가 => ", order_price);
      console.log("@@## rate_limit", res.rate_limit_status, "###############");
      // console.log("## rate_limit", res, "###############");
      coin_info[idx].previous_price = price;
      coin_info[idx].update_time = Date.now();
      return true;
    } else {
      console.log(symbol, position, "##### REPLACE_ORDER 실패 #####");
      console.log("/private/linear/order/replace", res);
      console.log("주문요청할때 코인 가격 => ", price);
      console.log(
        "coin_info[idx].previous_price",
        coin_info[idx].previous_price
      );
      console.log("####################################");
      console.log(params);
      console.log("####################################");
      if (res && res.ret_code == "30076") {
        coin_info[idx].previous_price = coin_info[idx].current_price;
      }
    }
  },

  close_all_position: async () => {
    const res = await getAxios("/private/linear/position/list");
    if (checkNullish(res)) return;

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
      if (checkNullish(res)) return;

      if (res.rate_limit_status == "0") {
        // 만약 limit_rate가 전부다 한 상태라면,
        trade.is_circuit_breaker = true;
        console.log("##### close_all_position breaker 발동");

        const after_time = parseInt(res.rate_limit_reset_ms) - Date.now();
        setTimeout(async () => {
          const res = await postAxios("/private/linear/order/create", params);
          if (checkNullish(res)) return;

          setTimeout(() => {
            trade.is_circuit_breaker = false;
          }, 1000);
        }, after_time + 500);
      }

      return res;
    });
  },
  close_one_position: async (symbol, qty_type, side, order_type, idx) => {
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });
    if (checkNullish(res)) return;

    // 이미 매도가 되었다면 skip
    if (res.result.length === 0) return;

    let qty;

    if (qty_type == "all") {
      qty = parseFloat(res?.result[side == "Buy" ? 0 : 1].size);
    } else if (qty_type == "1/3") {
      const qty_step = coin_info[idx].qty_step;
      const total_qty = parseFloat(res?.result[side == "Buy" ? 0 : 1].size);
      qty = total_qty / 3 - ((total_qty / 3) % qty_step);
    }

    console.log(symbol, side, qty, "### close_one_position_market", res);
    console.log(on_position_coin_list);
    const positionObj = on_position_coin_list.find(
      (e) => e.symbol == symbol && e.side == side
    );
    console.log("IMPORTANT !! ", positionObj);
    if (positionObj) {
      let params = {
        symbol: symbol,
        side: side == "Buy" ? "Sell" : "Buy",
        order_type: order_type,
        qty: qty,
        reduce_only: true,
        time_in_force: "FillOrKill",
        close_on_trigger: false,
      };
      if (order_type == "Limit") {
        params = {
          symbol: symbol,
          price: coin_info[idx].current_price,
          side: side == "Buy" ? "Sell" : "Buy",
          order_type: order_type,
          qty: qty,
          reduce_only: true,
          time_in_force: "FillOrKill",
          close_on_trigger: false,
        };
      }

      const res = await postAxios("/private/linear/order/create", params);
      if (checkNullish(res)) return;

      console.log(symbol, "### position 정리 ! ", res);

      // 판매가 완료 되었으면,  on_position_coin_list 에서 빼줌 .
      if (res?.ret_msg == "OK" && res?.ret_code == 0) {
        const idx = on_position_coin_list.findIndex(
          (e) => e.symbol == symbol && e.side == side
        );
        console.log("삭제할 side", side);
        console.log("삭제된 idx, ", idx);
        on_position_coin_list.splice(idx, 1);
        console.log("익절 / 손절해서 on_position_list에서 제외 해줌.");
        if (qty_type === "all") {
          coin_info[idx].profit_left_count = 3;
        } else {
          coin_info[idx].profit_left_count =
            coin_info[idx].profit_left_count - 1;
        }
        return true;
      }

      if (res?.rate_limit_status == "0") {
        // 만약 limit_rate가 전부다 한 상태라면,
        trade.is_circuit_breaker = true;
        console.log("##### close_one_position_market breaker 발동");

        const after_time = parseInt(res?.rate_limit_reset_ms) - Date.now();
        setTimeout(async () => {
          const res = await postAxios("/private/linear/order/create", params);
          if (checkNullish(res)) return;

          setTimeout(() => {
            trade.is_circuit_breaker = false;
          }, 1000);
        }, after_time + 500);
      }

      return false;
    } else {
      console.log("발견 못해서 return !!! ", symbol);
      return;
    }
  },

  get_current_price: async (symbol) => {
    const kline_res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: Math.ceil(Date.now() / 1000 - 100),
    });
    if (checkNullish(kline_res)) return;
    if (kline_res.ret_code == "10001")
      console.log("COINS에 코인 이름을 다시한번 확인해주세요.");
    const current_price = parseFloat(kline_res.result[0].close);

    return current_price;
  },
  create_limit_order: async (symbol, position, price, idx) => {
    const thisModule = require("./order");

    for (const position of on_position_coin_list) {
      // 이미 해당 포지션에 거래가 존재한다면 return 시킴.
      for (const my_order of coin_info[idx].order) {
        if (
          position.symbol == coin_info[idx].symbol &&
          position.side == my_order.side
        ) {
          console.log("이미 주문 들어가서 pass");
          return;
        }
      }
    }

    if (position === "Buy") {
      const res = await thisModule.order_long_position(
        symbol,
        price,
        `Buy-${Date.now()}`,
        idx
      );
      console.log("### order_long_position", res);
    } else if (position === "Sell") {
      const res = await thisModule.order_short_position(
        symbol,
        price,
        `Sell-${Date.now()}`,
        idx
      );
      console.log("### order_short_position", res);
    }
  },
  getTargetPrice: async (current_price, idx) => {
    const tick_size = coin_info[idx].tick_size;
    const target_price = current_price;

    /**
     * 소수점 자르는 로직
     */
    let precision_num = 0;
    const stringed_number = tick_size.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    target_price = target_price - (target_price % tick_size);

    target_price = parseFloat(target_price.toFixed(precision_num));

    return target_price;
    /**
     * THE END ####
     */
  },
};

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
  order_long_position: async (symbol, price, order_link_id) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const available_balance =
      (trade.total_money * trade.using_money_rate) / (2 * coin_info.length);

    const coinObject = coin_info.find((e) => e.symbol == symbol);
    if (!coinObject) return;

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
    const stop_loss = price - price * COIN_JSON_INFO.loss * 2;
    const take_profit = price + price * COIN_JSON_INFO.profit * 2;

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
      tp_trigger_by: "LastPrice",
      sl_trigger_by: "LastPrice",
    };

    const res = await postAxios("/private/linear/order/create", params);
    if (checkNullish(res)) return;
    return res;
  },
  order_short_position: async (symbol, price, order_link_id) => {
    // 얼마나 살건지 가격 측정하는 부분.
    const available_balance =
      (trade.total_money * trade.using_money_rate) / (2 * coin_info.length);

    const coinObject = coin_info.find((e) => e.symbol == symbol);
    if (!coinObject) return;

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
    const stringed_number = price.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    const stop_loss = price + price * COIN_JSON_INFO.loss * 2;
    const take_profit = price - price * COIN_JSON_INFO.profit * 2;
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
      tp_trigger_by: "LastPrice",
      sl_trigger_by: "LastPrice",
    };
    const res = await postAxios("/private/linear/order/create", params);
    console.log("qwdqwd", params);
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
  close_one_position_market: async (symbol, side) => {
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });
    if (checkNullish(res)) return;

    // 이미 매도가 되었다면 skip
    if (res.result.length === 0) return;

    const qty = parseFloat(res?.result[side == "Buy" ? 0 : 1].size);

    console.log(symbol, side, qty, "### close_one_position_market", res);
    console.log(on_position_coin_list);
    const positionObj = on_position_coin_list.find(
      (e) => e.symbol == symbol && e.side == side
    );
    console.log("IMPORTANT !! ", positionObj);
    if (positionObj) {
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

      return res;
    } else {
      console.log("발견 못해서 return !!! ", symbol);
      return;
    }
  },

  close_one_position_limit: async (symbol, side) => {
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });
    // 판매 리스트에 이미 없다면 return
    if (checkNullish(res)) return;
    if (res.result.length === 0) return;

    // console.log("#### /private/linear/position/list");
    // console.log(res);

    const qty = parseFloat(res?.result[side == "Buy" ? 0 : 1].size);

    console.log(symbol, side, qty, "### close_one_position_limit", res);
    console.log(on_position_coin_list);
    const positionObj = on_position_coin_list.find(
      (e) => e.symbol == symbol && e.side == side
    );

    console.log("IMPORTANT !! ", positionObj);
    const idx = coin_info.findIndex((e) => e.symbol == symbol);
    if (positionObj) {
      const params = {
        symbol: symbol,
        side: side == "Buy" ? "Sell" : "Buy",
        order_type: "Limit",
        price: coin_info[idx].current_price,
        qty: qty,
        reduce_only: true,
        time_in_force: "ImmediateOrCancel",
        close_on_trigger: false,
      };

      const res = await postAxios("/private/linear/order/create", params);

      if (checkNullish(res)) return;

      console.log(symbol, "### position 정리 ! ", res);
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
  // limit_rate가 걸렸을경우 전부 대기시키고 1순위로 주문을 넣어줘야댐.
  create_limit_order: async (symbol, order_position_list) => {
    const thisModule = require("./order");

    const idx = coin_info.findIndex((e) => e.symbol == symbol);
    if (idx == -1) return;

    /**
     * 롱 숏 both 조건 체크
     */
    if (trade.position_direction == "both") {
    } else if (trade.position_direction == "short") {
      order_position_list = order_position_list.filter((e) => e == 1 || e == 2);
    } else if (trade.position_direction == "long") {
      order_position_list = order_position_list.filter((e) => e == 3 || e == 4);
    }
    /**
     * #### The end
     */

    const order_price_list = [];
    const current_price = coin_info[idx].current_price;
    for (const position of order_position_list) {
      const target_price = await thisModule.getTargetPrice(
        symbol,
        current_price,
        position
      );
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

      if (checkNullish(short_res2)) return;

      console.log(symbol, "short_res2", short_res2);

      if (short_res2 && short_res2.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: short_res2.result.order_id,
          position: 1,
          price: parseFloat(order_price.price),
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
      // console.log(symbol, "short_res1", short_res1);

      if (short_res1 && short_res1.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: short_res1.result.order_id,
          position: 2,
          price: parseFloat(order_price.price),
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("short_res1 err!!!", short_res1);
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

      if (checkNullish(long_res1)) return;

      // console.log(symbol, "long_res1", long_res1);
      if (long_res1 && long_res1.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: long_res1.result.order_id,
          position: 3,
          price: parseFloat(order_price.price),
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("long_res1 err", long_res1);
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

      if (checkNullish(long_res2)) return;

      console.log(symbol, "long_res2", long_res2);

      if (long_res2 && long_res2.ret_msg == "OK") {
        coin_info[idx].order.push({
          id: long_res2.result.order_id,
          position: 4,
          price: parseFloat(order_price.price),
        });
        coin_info[idx].previous_price = order_price.price;
      } else {
        console.log("long_res2 err");
      }
    }
  },
  getTargetPrice: async (symbol, current_price, position) => {
    const coinObj = coin_info.find((e) => e.symbol == symbol);
    if (!coinObj) return;
    const white_list = COINS.white_list.find((e) => e.symbol == symbol);
    const tick_size = coinObj.tick_size;

    // #### 순간 장대 양봉/음봉 발현 => 체결 시 다시 되돌아 갈때 거래가 체결 되는걸 막아주는 로직
    let advantage_position = 1;
    // const time_res = await getAxios("/v2/public/time");

    // const server_time = parseInt(time_res.time_now.substr(0, 10));

    const server_time = parseInt(new Date().getTime() / 1000);

    const res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: server_time - 120,
    });

    if ((res != null || res != undefined) && res.result.length !== 0) {
      const coin_info_res = res.result[res.result.length - 1];

      if (
        ((parseFloat(coin_info_res.high) - parseFloat(coin_info_res.low)) /
          parseFloat(coin_info_res.high)) *
          100 >
        white_list.percentage * 1.3
      ) {
        // 분봉의 저점 혹은 고점에서 반대 방향으로 가는 포지션 더 늘려주게

        let position_percentage =
          (parseFloat(coin_info_res.high) - current_price) /
          (parseFloat(coin_info_res.high) - parseFloat(coin_info_res.low));
        console.log(
          "### 장대 음봉/양봉 발견 position_percentage =>",
          position_percentage
        );
        if (position == 2 && position_percentage > 0.75) {
          // 숏일때, 저점 근처에서 limit_order를 수정한다면, 더 가격을 높게 수정해줘야댐.
          //이건 아랫꼬리에서 가격을 업데이트 하는 경우임.
          console.log("## 아래꼬리에서 포지션 변경 #####");
          advantage_position = 1.5;
        } else if (position == 3 && position_percentage < 0.25) {
          // 롱일때,
          console.log("## 위꼬리에서 포지션 변경 #####");
          advantage_position = 1.5;
        }
      } else if (
        (parseFloat(coin_info_res.high) - parseFloat(coin_info_res.low)) /
          parseFloat(coin_info_res.high) >
        white_list.percentage * 2
      ) {
        // 분봉의 저점 혹은 고점에서 반대 방향으로 가는 포지션 더 늘려주게
        let position_percentage =
          (parseFloat(coin_info_res.high) - current_price) /
          (parseFloat(coin_info_res.high) - parseFloat(coin_info_res.low));
        if (position == 2 && position_percentage > 0.5) {
          // 숏일때, 저점 근처에서 limit_order를 수정한다면, 더 가격을 높게 수정해줘야댐.
          //이건 아랫꼬리에서 가격을 업데이트 하는 경우임.
          console.log("## 아래꼬리에서 포지션 변경 #####22");
          advantage_position = 2;
        } else if (position == 3 && position_percentage < 0.5) {
          // 롱일때,
          console.log("## 위꼬리에서 포지션 변경 #####22");
          advantage_position = 2;
        }
      }
    }
    // ############ THE END ###################

    let target_price = 0;

    // 만약 tick으로 설정했다면,
    if (white_list.percentage == 0) {
      if (position == 1) {
        target_price = current_price + tick_size * white_list.tick_size * 2;
      } else if (position == 2) {
        target_price = current_price + tick_size * white_list.tick_size;
      } else if (position == 3) {
        target_price = current_price - tick_size * white_list.tick_size;
      } else if (position == 4) {
        target_price = current_price - tick_size * white_list.tick_size * 2;
      }
    } else {
      // 만약 퍼샌테이지로 설정했다면,
      if (position == 1) {
        target_price =
          current_price + ((current_price * white_list.percentage) / 100) * 2;
      } else if (position == 2) {
        target_price =
          current_price +
          ((current_price * white_list.percentage) / 100) *
            TRADE.direction.sell *
            advantage_position;
      } else if (position == 3) {
        target_price =
          current_price -
          ((current_price * white_list.percentage) / 100) *
            TRADE.direction.buy *
            advantage_position;
      } else if (position == 4) {
        target_price =
          current_price - ((current_price * white_list.percentage) / 100) * 2;
      }
    }

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
